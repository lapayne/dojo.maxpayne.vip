"use client";
import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { db, auth } from "../lib/firebase";
import {
  collection,
  doc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import {
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  SAMLAuthProvider,
  User,
} from "firebase/auth";
import { useRouter } from "next/navigation";

interface UserPoints {
  name: string;
  points: number;
}

const Home: NextPage = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [name, setName] = useState("");
  const [points, setPoints] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<UserPoints[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);

  // 🔐 Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/"); // 🚪 kick out
      } else {
        setUser(u);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // 📊 Firestore listener (only when logged in)
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "dojo"), orderBy("points", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserPoints[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push({ name: doc.id, points: doc.data().points });
      });
      setUsers(usersData);
      setTableLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 🔑 Login (SAML)
  const handleLogin = async () => {
    try {
      const provider = new SAMLAuthProvider("saml.entraid"); // ⚠️ match your Firebase ID
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  // 🚪 Logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.reload(); // important for SAML
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setMessage("Error: Name cannot be empty.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const userDocRef = doc(db, "dojo", trimmedName);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        let newPoints = Number(points);

        if (userDoc.exists()) {
          newPoints += userDoc.data().points || 0;
        }

        transaction.set(userDocRef, { points: newPoints });
      });

      setMessage(`Successfully gave ${points} points to ${trimmedName}.`);
      setName("");
      setPoints(1);
    } catch (error) {
      setMessage("Error: Could not add points.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllPoints = async () => {
    if (!window.confirm("Reset all points to zero?")) return;

    setResetLoading(true);

    try {
      const snapshot = await getDocs(collection(db, "dojo"));
      const batch = writeBatch(db);

      snapshot.forEach((doc) => {
        batch.update(doc.ref, { points: 0 });
      });

      await batch.commit();
      setMessage("All points reset.");
    } catch {
      setMessage("Failed to reset.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async (userName: string) => {
    if (!window.confirm(`Delete ${userName}?`)) return;

    try {
      await deleteDoc(doc(db, "dojo", userName));
      setMessage(`Deleted ${userName}.`);
    } catch (error) {
      setMessage("Delete failed.");
      console.error(error);
    }
  };

  // ⏳ Loading state
  if (authLoading) return <p style={{ padding: 40 }}>Loading...</p>;

  // 🔐 Not logged in
  if (!user) {
    return (
      <div
        style={{ display: "flex", justifyContent: "center", marginTop: 100 }}
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
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        gap: "50px",
        padding: "50px",
        flexWrap: "wrap",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          padding: "20px",
          border: "1px solid #ccc",
          borderRadius: "5px",
          height: "fit-content",
        }}
      >
        <h1>Give Points</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="name"
              style={{ display: "block", marginBottom: "5px" }}
            >
              Name:
            </label>
            <input
              id="name"
              type="text"
              list="user-names"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "8px",
                boxSizing: "border-box",
                colorScheme: "light dark",
                backgroundColor: "var(--input-bg, Field)",
                color: "var(--input-text, FieldText)",
              }}
            />
            <datalist id="user-names">
              {users.map((user) => (
                <option key={user.name} value={user.name} />
              ))}
            </datalist>
          </div>
          <div style={{ marginBottom: "15px" }}>
            <label
              htmlFor="points"
              style={{ display: "block", marginBottom: "5px" }}
            >
              Points:
            </label>
            <input
              id="points"
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              min="1"
              required
              style={{
                width: "100%",
                padding: "8px",
                boxSizing: "border-box",
                colorScheme: "light dark",
                backgroundColor: "var(--input-bg, Field)",
                color: "var(--input-text, FieldText)",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 15px",
                border: "none",
                background: "#0070f3",
                color: "white",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              {loading ? "Updating..." : "Give Points"}
            </button>
            <button
              type="button"
              onClick={handleResetAllPoints}
              disabled={resetLoading || users.length === 0}
              style={{
                padding: "8px 12px",
                border: "1px solid #ff4d4d",
                background: "transparent",
                color: "#ff4d4d",
                borderRadius: "5px",
                cursor: "pointer",
                opacity: resetLoading || users.length === 0 ? 0.5 : 1,
              }}
            >
              {resetLoading ? "Resetting..." : "Reset All"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                border: "none",
                background: "#d32f2f",
                color: "white",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Logout
            </button>
          </div>
        </form>
        {message && <p style={{ marginTop: "15px" }}>{message}</p>}
      </div>

      <div style={{ maxWidth: "400px", width: "100%" }}>
        <h2>Leaderboard</h2>
        {tableLoading ? (
          <p>Loading scores...</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #333" }}>
                <th style={{ padding: "10px", textAlign: "left" }}>Name</th>
                <th style={{ padding: "10px", textAlign: "right" }}>Points</th>
                <th style={{ padding: "10px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr
                    key={user.name}
                    style={{ borderBottom: "1px solid #ddd" }}
                  >
                    <td style={{ padding: "10px" }}>{user.name}</td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {user.points}
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <button
                        onClick={() => handleDeleteUser(user.name)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "red",
                          cursor: "pointer",
                          fontSize: "16px",
                        }}
                        title="Delete User"
                      >
                        ✖
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={3}
                    style={{ padding: "10px", textAlign: "center" }}
                  >
                    No points awarded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Home;
