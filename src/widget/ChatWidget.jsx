import React, { useEffect, useState } from 'react';
import { Box, IconButton, Badge, Paper, Avatar, Typography, Button } from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import ReplyIcon from '@mui/icons-material/Reply';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';

const ChatWidget = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadConversations, setUnreadConversations] = useState([]);
  const [openPopup, setOpenPopup] = useState(false);
  const navigate = useNavigate();
  const { mode } = useThemeContext();

  const fetchConversations = async () => {
    try {
      const res = await API.get('/chat/conversations/');
      const convs = res.data || [];
      const unread = convs.filter(c => c.unread_count && c.unread_count > 0);
      setUnreadConversations(unread);
      setUnreadCount(unread.reduce((s, c) => s + (c.unread_count || 0), 0));
    } catch (err) {
      console.error('[ChatWidget] fetchConversations error', err);
    }
  };

  useEffect(() => {
    fetchConversations();
    const id = setInterval(fetchConversations, 10000);
    return () => clearInterval(id);
  }, []);

  const markAsReadAndOpen = async (convId) => {
    try {
      console.log("Mark as read URL:", `/chat/conversations/${convId}/mark_as_read/`);
      await API.post(`/chat/conversations/${convId}/mark_as_read/`);
      await fetchConversations();
      setOpenPopup(false);
      navigate('/chat', { state: { convId } });
    } catch (err) {
      console.error('[ChatWidget] mark_as_read error', err);
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1400 }}>
      <Badge badgeContent={unreadCount} color="error">
        <IconButton
          onClick={() => setOpenPopup(v => !v)}
          sx={{
            backgroundColor: mode === 'dark' ? '#424242' : '#25D366',
            color: 'common.white',
            width: 56,
            height: 56,
            '&:hover': { backgroundColor: mode === 'dark' ? '#616161' : '#20B058' }
          }}
        >
          <ChatIcon />
        </IconButton>
      </Badge>

      {openPopup && (
        <Paper elevation={6} sx={{
          position: 'absolute', bottom: 80, right: 0, width: 320, maxHeight: 420, overflow: 'auto', p: 1,
          bgcolor: mode === 'dark' ? '#1E1E1E' : '#ffffff'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
            <Typography variant="subtitle1">Unread messages</Typography>
            <IconButton size="small" onClick={() => setOpenPopup(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {unreadConversations.length === 0 ? (
            <Typography sx={{ p: 2, color: 'text.secondary' }}>No new messages</Typography>
          ) : (
            unreadConversations.map(conv => {
              const other = (conv.participants || []).find(p => p.id !== (parseInt(localStorage.getItem('userId')) || null));
              const incoming = conv.last_message_from_other || conv.last_message;
              return (
                <Box key={conv.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <Avatar src={other?.profile_image} sx={{ width: 40, height: 40 }}>
                    {other?.initials || (other?.full_name?.[0] ?? other?.email?.[0] ?? 'U')}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2">
                      {other?.full_name ?? other?.email} <Typography component="span" sx={{ color: 'text.secondary', fontSize: 12 }}>({other?.role ?? 'N/A'})</Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {incoming?.content ?? '—'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Button size="small" variant="outlined" startIcon={<ReplyIcon />} onClick={() => markAsReadAndOpen(conv.id)}>
                        Reply
                      </Button>
                      <Button size="small" onClick={() => markAsReadAndOpen(conv.id)}>
                        View
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ChatWidget;