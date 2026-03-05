"use client";
import { useState, useEffect } from "react";
import type { NextPage } from "next";
import { db } from "./lib/firebase";
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

interface UserPoints {
  name: string;
  points: number;
}

const Home: NextPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passcode, setPasscode] = useState<string>("");
  const [loginError, setLoginError] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [points, setPoints] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [users, setUsers] = useState<UserPoints[]>([]);
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [resetLoading, setResetLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === "3489") {
      setIsAuthenticated(true);
      setLoginError("");
      setPasscode("");
    } else {
      setLoginError("Incorrect passcode.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setMessage("");
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
      console.error("Transaction failed: ", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetAllPoints = async () => {
    const isConfirmed = window.confirm(
      "Are you sure you want to reset all points to zero?",
    );
    if (!isConfirmed) return;

    setResetLoading(true);
    try {
      const usersCollectionRef = collection(db, "dojo");
      const querySnapshot = await getDocs(usersCollectionRef);
      const batch = writeBatch(db);
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { points: 0 });
      });
      await batch.commit();
      setMessage("Successfully reset all points to zero.");
    } catch (error) {
      setMessage("Error: Failed to reset points.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleDeleteUser = async (userName: string) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete ${userName}?`,
    );
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, "dojo", userName));
      setMessage(`Successfully deleted ${userName}.`);
    } catch (error) {
      setMessage(`Error: Could not delete ${userName}.`);
      console.error("Delete failed: ", error);
    }
  };

  if (!isAuthenticated) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          flexDirection: "column",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            padding: "40px",
            border: "1px solid #ccc",
            borderRadius: "8px",
            textAlign: "center",
          }}
        >
          <h1>Enter Passcode</h1>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            style={{
              padding: "10px",
              width: "200px",
              marginBottom: "10px",
              display: "block",
              colorScheme: "light dark",
              backgroundColor: "var(--input-bg, Field)",
              color: "var(--input-text, FieldText)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "10px 20px",
              background: "#0070f3",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            Login
          </button>
          {loginError && (
            <p style={{ color: "red", marginTop: "10px" }}>{loginError}</p>
          )}
        </form>
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
