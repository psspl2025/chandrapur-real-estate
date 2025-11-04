import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function GDriveCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.split("?")[1];
    const params = new URLSearchParams(hash);
    const token = params.get("token");

    if (!token) {
      navigate("/properties?gdrive_error=missing_token");
      return;
    }

    fetch("https://api.psspl.pawanssiddhi.in/api/auth/finalize", {
      method: "POST",
      credentials: "include", // important to set cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then(() => navigate("/#/gdrive-connected"))
      .catch(() => navigate("/properties?gdrive_error=exchange_failed"));
  }, [navigate]);

  return <p>Finishing Google Drive connection...</p>;
}
