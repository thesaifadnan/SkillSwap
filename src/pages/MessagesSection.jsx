import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, serverTimestamp, onSnapshot, orderBy } from 'firebase/firestore';
import LoadingSpinner from '../components/LoadingSpinner';
import './MessagesSection.css';

export default function MessagesSection() {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch user's conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        if (!auth.currentUser) {
          navigate('/login');
          return;
        }

        const q = query(
          collection(db, 'conversations'),
          where('participants', 'array-contains', auth.currentUser.uid)
        );

        const querySnapshot = await getDocs(q);
        const conversationsData = [];

        for (const docRef of querySnapshot.docs) {
          const convo = docRef.data();
          const otherUserId = convo.participants.find(id => id !== auth.currentUser.uid);
          
          if (otherUserId) {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) {
              conversationsData.push({
                id: docRef.id,
                ...convo,
                otherUser: userDoc.data()
              });
            }
          }
        }

        setConversations(conversationsData);
        
        // Automatically select first conversation if none selected
        if (conversationsData.length > 0 && !activeConversation) {
          setActiveConversation(conversationsData[0].id);
        }

      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [navigate]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation) return;

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'conversations', activeConversation, 'messages'),
        orderBy('timestamp', 'asc')
      ),
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));
        setMessages(messagesData);
      },
      (err) => {
        console.error('Error listening to messages:', err);
        setError('Failed to load messages');
      }
    );

    return () => unsubscribe();
  }, [activeConversation]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    try {
      await addDoc(
        collection(db, 'conversations', activeConversation, 'messages'),
        {
          text: newMessage,
          senderId: auth.currentUser.uid,
          timestamp: serverTimestamp()
        }
      );
      setNewMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const startNewConversation = async (userId) => {
    try {
      // Check if conversation already exists
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', auth.currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const existingConvo = querySnapshot.docs.find(doc => 
        doc.data().participants.includes(userId)
      );

      if (existingConvo) {
        setActiveConversation(existingConvo.id);
        return;
      }

      // Create new conversation
      const newConvoRef = await addDoc(collection(db, 'conversations'), {
        participants: [auth.currentUser.uid, userId],
        createdAt: serverTimestamp()
      });

      setActiveConversation(newConvoRef.id);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to start conversation');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="messages-section">
      <div className="conversations-list">
        <h3>Conversations</h3>
        {error && <div className="error-message">{error}</div>}
        
        {conversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet. Start by messaging a skill match!</p>
          </div>
        ) : (
          <ul>
            {conversations.map(convo => (
              <li 
                key={convo.id}
                className={`conversation-item ${activeConversation === convo.id ? 'active' : ''}`}
                onClick={() => setActiveConversation(convo.id)}
              >
                <div className="conversation-avatar">
                  {convo.otherUser.photoURL ? (
                    <img src={convo.otherUser.photoURL} alt={convo.otherUser.displayName} />
                  ) : (
                    <div className="avatar-placeholder">
                      {convo.otherUser.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="conversation-info">
                  <h4>{convo.otherUser.displayName || 'Anonymous'}</h4>
                  <p className="last-message">
                    {convo.lastMessage?.text || 'No messages yet'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="chat-container">
        {activeConversation ? (
          <>
            <div className="chat-header">
              {conversations.find(c => c.id === activeConversation)?.otherUser?.displayName || 'Chat'}
            </div>
            
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <p>Start your conversation!</p>
                </div>
              ) : (
                messages.map(message => (
                  <div 
                    key={message.id}
                    className={`message ${message.senderId === auth.currentUser.uid ? 'sent' : 'received'}`}
                  >
                    <div className="message-content">
                      <p>{message.text}</p>
                      <span className="message-time">
                        {message.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                required
              />
              <button type="submit">Send</button>
            </form>
          </>
        ) : (
          <div className="no-conversation-selected">
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>
    </div>
  );
}