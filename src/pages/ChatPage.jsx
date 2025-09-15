import React, { useState, useEffect, useRef, useCallback } from 'react'; // Add useCallback
import {
  Box,
  TextField,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Badge,
  CircularProgress,
  Button
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import API from '../api';
import { useThemeContext } from '../context/ThemeContext';

function getCurrentUserFromLocalStorage() {
  const rawUser = localStorage.getItem('user');
  if (rawUser) {
    try {
      const parsed = JSON.parse(rawUser);
      return { id: parsed.id ?? parsed.user_id ?? null, email: parsed.email ?? parsed.user_email ?? '' };
    } catch (_) {}
  }
  const idRaw = localStorage.getItem('userId') ?? localStorage.getItem('id');
  const id = idRaw ? parseInt(idRaw) : null;
  const email = localStorage.getItem('email') || localStorage.getItem('userEmail') || '';
  return { id, email };
}

const ChatPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeContext();

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [newMessage, setNewMessage] = useState('');

  const currentUser = getCurrentUserFromLocalStorage();
  const userId = currentUser.id;
  const userEmail = currentUser.email;

  // helpers
  const getOtherParticipant = (conv) => {
    if (!conv || !Array.isArray(conv.participants)) return null;
    for (const p of conv.participants) {
      if (!p) continue;
      if (typeof p === 'object') {
        if (userId != null && p.id != null && p.id !== userId) return p;
        if (p.email && p.email !== userEmail) return p;
      } else if (typeof p === 'string' && p !== userEmail) {
        return { email: p, full_name: p, id: null };
      } else if (typeof p === 'number' && (userId == null || p !== userId)) {
        return { id: p, email: '', full_name: '' };
      }
    }
    const first = conv.participants && conv.participants[0];
    if (!first) return null;
    return (typeof first === 'object') ? first : (typeof first === 'string' ? { email: first, full_name: first } : { id: first });
  };

  // fetch list of conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await API.get('/chat/conversations/');
      setConversations(res.data || []);
    } catch (err) {
      console.error('fetchConversations error', err);
      if (err?.response?.status === 401) navigate('/login');
    }
  }, [navigate, setConversations]); // Add dependencies

  // fetch messages for a conversation and store them keyed by id
  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    try {
      const res = await API.get(`/chat/conversations/${conversationId}/messages/`);
      setMessagesByConversation(prev => ({ ...prev, [conversationId]: res.data || [] }));
    } catch (err) {
      console.error('fetchMessages error', err);
    }
  };

  // fetch conversation detail
  const fetchConversationDetail = async (conversationId) => {
    if (!conversationId) return null;
    try {
      const res = await API.get(`/chat/conversations/${conversationId}/`);
      return res.data;
    } catch (err) {
      console.error('fetchConversationDetail error', err);
      return null;
    }
  };

  useEffect(() => {
    fetchConversations();
    const id = setInterval(fetchConversations, 10000);
    return () => clearInterval(id);
  }, [fetchConversations]);

  // handle location state: open conv if navigated from widget
  useEffect(() => {
    const convId = location?.state?.convId;
    if (convId) {
      (async () => {
        try {
          const detail = await fetchConversationDetail(convId);
          if (detail) {
            setSelectedConversation(detail);
            await fetchMessages(convId);
            await API.post(`/chat/conversations/${convId}/mark_as_read/`);
            await fetchConversations();
          }
        } catch (err) {
          console.error('openFromLocation error', err);
        } finally {
          navigate(location.pathname, { replace: true, state: {} });
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state]);

  // Mark as read when a conversation is opened
  useEffect(() => {
    if (selectedConversation) {
      API.post(`/chat/conversations/${selectedConversation.id}/mark_as_read/`)
        .catch(err => console.error('mark_as_read failed', err));
    }
  }, [selectedConversation]);

  useEffect(() => {
    // scroll to bottom when messages change for the current conversation
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesByConversation, selectedConversation]);

  // search users (debounced)
  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await API.get(`/chat/users/search/?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data?.results || []);
      } catch (err) {
        console.error('search error', err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // open or create a conversation with a user
  const openConversationWithUser = async (participantId) => {
    if (!participantId) return;
    if (userId != null && parseInt(participantId) === userId) {
      console.warn('Attempt to chat with self ignored.');
      return;
    }
    setSearchResults([]);
    setSearchQuery('');
    try {
      const existing = conversations.find(conv =>
        Array.isArray(conv.participants) && conv.participants.some(p => {
          if (!p) return false;
          if (typeof p === 'object') return p.id === participantId || p.email === String(participantId);
          if (typeof p === 'string') return p === String(participantId) || p === userEmail;
          if (typeof p === 'number') return p === participantId;
          return false;
        })
      );
      let convData = existing;
      if (!existing) {
        const res = await API.post('/chat/conversations/', { participant_id: participantId });
        convData = res.data;
        const detail = await fetchConversationDetail(convData.id);
        convData = detail || convData;
        setConversations(prev => [convData, ...prev.filter(c => c.id !== convData.id)]);
      } else {
        const detail = await fetchConversationDetail(existing.id);
        convData = detail || existing;
      }
      setSelectedConversation(convData);
      await fetchMessages(convData.id);
      await API.post(`/chat/conversations/${convData.id}/mark_as_read/`);
      await fetchConversations();
    } catch (err) {
      console.error('openConversationWithUser error', err);
    }
  };

  // send message (posts to server and refreshes messages & conversation list)
  const handleSendMessage = async () => {
    if (!newMessage?.trim()) return;
    if (!selectedConversation?.id) {
      console.warn('No selected conversation to send to');
      return;
    }
    const convId = selectedConversation.id;
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: newMessage,
      sender: { id: userId, email: userEmail, full_name: localStorage.getItem('fullName') || '' },
      timestamp: new Date().toISOString(),
      initials: (localStorage.getItem('fullName') || userEmail || 'U')[0]?.toUpperCase(),
      is_read: true
    };
    setMessagesByConversation(prev => {
      const arr = prev[convId] ? [...prev[convId], tempMessage] : [tempMessage];
      return { ...prev, [convId]: arr };
    });
    setNewMessage('');
    setSending(true);

    try {
      const res = await API.post(`/chat/conversations/${convId}/messages/`, { content: tempMessage.content });
      setMessagesByConversation(prev => {
        const arr = (prev[convId] || []).map(m => (m.id === tempId ? res.data : m));
        if (!arr.some(m => m.id === res.data.id)) arr.push(res.data);
        return { ...prev, [convId]: arr };
      });
      await fetchConversations();
    } catch (err) {
      console.error('handleSendMessage error', err);
      setMessagesByConversation(prev => ({
        ...prev,
        [convId]: (prev[convId] || []).map(m => m.id === tempId ? { ...m, failed: true } : m)
      }));
    } finally {
      setSending(false);
    }
  };

  const messages = messagesByConversation[selectedConversation?.id] || [];

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', mt: 8 }}>
      {/* Sidebar */}
      <Box sx={{
        width: 320,
        borderRight: `1px solid ${mode === 'dark' ? '#616161' : '#ccc'}`,
        p: 2,
        overflowY: 'auto',
        bgcolor: mode === 'dark' ? '#222' : '#fff'
      }}>
        <TextField
          fullWidth
          placeholder="Search users..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          InputProps={{ style: { background: mode === 'dark' ? '#333' : '#f7f7f7' } }}
        />
        {searching ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : searchResults.length > 0 ? (
          <List sx={{ mt: 1 }}>
            {searchResults.map(user => (
              <ListItem key={user.id} button onClick={() => openConversationWithUser(user.id)} sx={{ '&:hover': { backgroundColor: mode === 'dark' ? '#333' : '#f0f0f0' } }}>
                <ListItemAvatar>
                  <Avatar src={user.profile_image}>{user.initials || (user.full_name?.[0] ?? user.email?.[0] ?? 'U')}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={user.full_name ?? user.email} secondary={`${user.role ?? 'N/A'} • ${user.email}`} />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography sx={{ mt: 1, color: mode === 'dark' ? '#aaa' : '#666' }}>No users found</Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Conversations</Typography>
          <List>
            {conversations.map(conv => {
              const other = getOtherParticipant(conv);
              const lastPreview = conv.last_message_from_other || conv.last_message;
              return (
                <ListItem
                  key={conv.id}
                  button
                  selected={selectedConversation?.id === conv.id}
                  onClick={async () => {
                    const detail = await fetchConversationDetail(conv.id) || conv;
                    setSelectedConversation(detail);
                    await fetchMessages(detail.id);
                    await API.post(`/chat/conversations/${detail.id}/mark_as_read/`);
                    await fetchConversations();
                  }}
                  sx={{ '&:hover': { backgroundColor: mode === 'dark' ? '#333' : '#f0f0f0' } }}
                >
                  <ListItemAvatar>
                    <Avatar src={other?.profile_image}>{other?.initials || (other?.full_name?.[0] ?? other?.email?.[0] ?? 'U')}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={other?.full_name ?? other?.email ?? 'Unknown'}
                    secondary={lastPreview?.content ?? 'No messages yet'}
                  />
                  {conv.unread_count > 0 && <Badge badgeContent={conv.unread_count} color="error" />}
                </ListItem>
              );
            })}
          </List>
        </Box>
      </Box>

      {/* Chat area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {selectedConversation ? (
          <>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              borderBottom: `1px solid ${mode === 'dark' ? '#616161' : '#ccc'}`,
              p: 2,
              bgcolor: mode === 'dark' ? '#1b1b1b' : '#fafafa'
            }}>
              <Avatar src={getOtherParticipant(selectedConversation)?.profile_image} sx={{ mr: 2 }}>
                {getOtherParticipant(selectedConversation)?.initials ?? (getOtherParticipant(selectedConversation)?.full_name?.[0] ?? 'U')}
              </Avatar>
              <Box>
                <Typography variant="h6">
                  {getOtherParticipant(selectedConversation)?.full_name ?? getOtherParticipant(selectedConversation)?.email ?? 'Unknown'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {getOtherParticipant(selectedConversation)?.role ?? 'N/A'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: mode === 'dark' ? '#121212' : '#fff' }}>
              {messages.length === 0 ? (
                <Typography color="textSecondary" align="center">No messages yet</Typography>
              ) : (
                messages.map((m, i) => {
                  const sent = (() => {
                    if (!m) return false;
                    if (typeof m.sender === 'object' && m.sender !== null && m.sender.id !== undefined) return m.sender.id === userId;
                    if (typeof m.sender === 'string') return m.sender === userEmail;
                    if (typeof m.sender === 'number') return m.sender === userId;
                    return false;
                  })();
                  const showDate = i === 0 || new Date(m.timestamp).toDateString() !== new Date(messages[i-1]?.timestamp).toDateString();
                  return (
                    <Box key={m.id ?? i} sx={{ mb: 1 }}>
                      {showDate && (
                        <Typography align="center" variant="caption" color="textSecondary" sx={{ my: 1 }}>
                          {new Date(m.timestamp).toLocaleDateString()}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '70%' }}>
                          {!sent && <Avatar sx={{ mr: 1 }}>{m.initials ?? (typeof m.sender === 'string' ? m.sender[0]?.toUpperCase() : 'U')}</Avatar>}
                          <Box sx={{
                            bgcolor: sent ? '#dcf8c6' : (mode === 'dark' ? '#242424' : '#f0f0f0'),
                            p: 1,
                            borderRadius: 2,
                            wordBreak: 'break-word'
                          }}>
                            <Typography>{m.content}</Typography>
                            <Typography variant="caption" color="textSecondary">
                              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Typography>
                          </Box>
                          {sent && <Avatar sx={{ ml: 1 }}>{m.initials ?? (typeof m.sender === 'string' ? m.sender[0]?.toUpperCase() : 'U')}</Avatar>}
                        </Box>
                      </Box>
                    </Box>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </Box>

            <Box sx={{ p: 2, display: 'flex', gap: 2, borderTop: `1px solid ${mode === 'dark' ? '#616161' : '#ccc'}` }}>
              <TextField
                fullWidth
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                placeholder="Type a message..."
              />
              <Button variant="contained" onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
                {sending ? <CircularProgress size={20} /> : 'Send'}
              </Button>
            </Box>
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography>Select a conversation to start chatting</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default ChatPage;