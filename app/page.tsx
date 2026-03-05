'use client';
import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import { db } from './lib/firebase';
import {
  collection,
  doc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  getDocs, // To fetch all documents for reset
  writeBatch // To perform a batched write
} from "firebase/firestore";

// Define the shape of our user data
interface UserPoints {
  name: string;
  points: number;
}

const Home: NextPage = () => {
  // State for the form
  const [name, setName] = useState<string>('');
  const [points, setPoints] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');

  // State for the leaderboard and reset functionality
  const [users, setUsers] = useState<UserPoints[]>([]);
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [resetLoading, setResetLoading] = useState<boolean>(false);


  // Effect to listen for real-time updates from Firestore
  useEffect(() => {
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
  }, []);

  // Handler for the form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
        setMessage("Error: Name cannot be empty.");
        return;
    }
    setLoading(true);
    setMessage('');

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
      setName('');
      setPoints(1);
    } catch (error) {
      setMessage('Error: Could not add points.');
      console.error("Transaction failed: ", error);
    } finally {
      setLoading(false);
    }
  };

  // === NEW: Handler for the Reset All Points button ===
  const handleResetAllPoints = async () => {
    // 1. Confirm the action with the user
    const isConfirmed = window.confirm(
      "Are you sure you want to reset all points to zero? This action cannot be undone."
    );

    if (!isConfirmed) {
      return;
    }

    setResetLoading(true);
    setMessage('');

    try {
      // 2. Get all documents from the 'users' collection
      const usersCollectionRef = collection(db, "dojo");
      const querySnapshot = await getDocs(usersCollectionRef);
      
      // 3. Create a new batched write
      const batch = writeBatch(db);

      // 4. For each document, add an update operation to the batch
      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { points: 0 });
      });

      // 5. Commit the batch
      await batch.commit();

      setMessage("Successfully reset all points to zero.");
    } catch (error) {
      setMessage("Error: Failed to reset points.");
      console.error("Failed to reset points:", error);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', padding: '50px', flexWrap: 'wrap' }}>
      {/* Form Section */}
      <div style={{ maxWidth: '400px', padding: '20px', border: '1px solid #ccc', borderRadius: '5px', height: 'fit-content' }}>
        {/* ... form is unchanged ... */}
        <h1>Give Points</h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '5px' }}>Name (select or type new):</label>
            <input id="name" type="text" list="user-names" value={name} onChange={(e) => setName(e.target.value)} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
            <datalist id="user-names">{users.map(user => (<option key={user.name} value={user.name} />))}</datalist>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="points" style={{ display: 'block', marginBottom: '5px' }}>Points:</label>
            <input id="points" type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} min="1" required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}/>
          </div>
          <button type="submit" disabled={loading} style={{ padding: '10px 15px', border: 'none', background: '#0070f3', color: 'white', borderRadius: '5px', cursor: 'pointer' }}>
            {loading ? 'Updating...' : 'Give Points'}
          </button>
          &nbsp;&nbsp;
                    <button 
            onClick={handleResetAllPoints} 
            disabled={resetLoading || users.length === 0}
            style={{ 
              padding: '8px 12px', 
              border: '1px solid #ff4d4d',
              background: 'transparent',
              color: '#ff4d4d', 
              borderRadius: '5px', 
              cursor: 'pointer',
              opacity: (resetLoading || users.length === 0) ? 0.5 : 1
            }}
          >
            {resetLoading ? 'Resetting...' : 'Reset All'}
          </button>
        </form>
        {message && <p style={{ marginTop: '15px' }}>{message}</p>}
      </div>

      {/* Leaderboard Section */}
      <div style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h2>Leaderboard</h2>
          {/* === NEW: Reset Button === */}

        </div>
        {/* ... table is unchanged ... */}
        {tableLoading ? ( <p>Loading scores...</p> ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #333' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '10px', textAlign: 'right' }}>Points</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? ( users.map((user) => (
                  <tr key={user.name} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '10px' }}>{user.name}</td>
                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{user.points}</td>
                  </tr>
                ))) : ( <tr><td colSpan={2} style={{ padding: '10px', textAlign: 'center' }}>No points awarded yet.</td></tr> )
              }
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Home;

