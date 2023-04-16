import {
  openZuzaluMembershipPopup,
  usePassportPopupMessages,
  useSemaphoreGroupProof,
} from "@pcd/passport-interface";
import { useEffect, useState } from "react";
import { login } from "../src/api";
import { PASSPORT_URL, SEMAPHORE_GROUP_URL } from "../src/util";
import { ErrorOverlay, ZupollError } from "./shared/ErrorOverlay";

/**
 * Login for the user who belongs to the specified semaphore group.
 * Generate a semaphore proof, calls the /login endpoint on the server, and
 * gets a JWT. The JWT can be used to make other requests to the server.
 * @param onLoggedIn a callback function which will be called after the user
 * logged in with the JWT.
 */
export function Login({
  onLoggedIn,
  requestedGroup,
  prompt,
}: {
  onLoggedIn: (token: string, group: string) => void;
  requestedGroup: string;
  prompt: string;
}) {
  const [error, setError] = useState<ZupollError>();
  const [loggingIn, setLoggingIn] = useState(false);

  const [pcdStr, _passportPendingPCDStr] = usePassportPopupMessages();
  const {
    proof,
    valid,
    error: proofError,
  } = useSemaphoreGroupProof(pcdStr, SEMAPHORE_GROUP_URL, "zupoll");

  useEffect(() => {
    if (valid === undefined) return;

    if (proofError) {
      console.error("error using semaphore passport proof: ", proofError);
      const err = {
        title: "Login failed",
        message: "There's an error in generating proof.",
      } as ZupollError;
      setError(err);
      setLoggingIn(false);
      return;
    }

    if (!valid) {
      const err = {
        title: "Login failed",
        message: "Proof is invalid.",
      } as ZupollError;
      setError(err);
      setLoggingIn(false);
      return;
    }

    const sendLogin = async () => {
      const res = await login(requestedGroup, pcdStr);
      if (!res.ok) {
        const resErr = await res.text();
        console.error("error login to the server: ", resErr);
        const err = {
          title: "Login failed",
          message: "Fail to connect to the server, please try again later.",
        } as ZupollError;
        setError(err);
        setLoggingIn(false);
        return;
      }
      const token = await res.json();
      return token.accessToken;
    };

    sendLogin().then((accessToken) => {
      setLoggingIn(false);
      onLoggedIn(accessToken, requestedGroup);
    });
  }, [proof, valid, proofError, pcdStr, onLoggedIn, requestedGroup]);

  return (
    <>
      <button
        onClick={() => {
          setLoggingIn(true);
          openZuzaluMembershipPopup(
            PASSPORT_URL,
            window.location.origin + "/popup",
            SEMAPHORE_GROUP_URL,
            "zupoll"
          );
        }}
        disabled={loggingIn}
      >
        {prompt}
      </button>
      {error && (
        <ErrorOverlay error={error} onClose={() => setError(undefined)} />
      )}
      <br />
      <br />
    </>
  );
}
