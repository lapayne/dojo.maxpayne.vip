"use client";
import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { auth } from "./lib/firebase";

import { onAuthStateChanged, signOut, User } from "firebase/auth";
import LogoutIcon from "@mui/icons-material/Logout";
import { signInWithPopup, SAMLAuthProvider } from "firebase/auth";
import { useRouter } from "next/navigation";

const Home: NextPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [openLogin, setOpenLogin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        setUser(u);
      } else {
        router.push("/admin");
      }
    });

    return () => unsubscribe();
  }, [router]);
  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleLogin = async () => {
    try {
      const provider = new SAMLAuthProvider("saml.entraid"); // ⚠️ match your Firebase ID
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4">
      {!user ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: 100,
            }}
          >
            <button
              onClick={handleLogin}
              style={{
                padding: "12px 20px",
                background: "#0078d4",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              Sign in with Microsoft
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-lg">Welcome, {user.displayName || user.email}</p>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
          >
            <LogoutIcon />
            Logout
          </button>
        </>
      )}
    </main>
  );
};

export default Home;
