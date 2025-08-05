import React, { useState, useEffect } from 'react';
import { 
  Box, 
  IconButton, 
  TextField, 
  Avatar, 
  Typography, 
  Paper,
  Slide,
  useTheme
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';

const ChatWidget = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { text: 'Hello! How can we help you today?', sender: 'bot' }
  ]);

  const handleSendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, { text: message, sender: 'user' }]);
      setMessage('');
      
      // Simulate bot reply after 1 second
      setTimeout(() => {
        setMessages(prev => [...prev, { text: 'Thanks for your message! Our team will respond shortly.', sender: 'bot' }]);
      }, 1000);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    const chatContainer = document.getElementById('chat-messages');
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  return (
    <Box sx={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: 2
    }}>
      <Slide direction="up" in={open} mountOnEnter unmountOnExit>
        <Paper elevation={3} sx={{
          width: 280,
          height: 300,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`
        }}>
          <Box sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[100],
            color: theme.palette.text.primary,
            borderBottom: `1px solid ${theme.palette.divider}`
          }}>
            <Typography variant="subtitle1" fontWeight={600}>
              Support Chat
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => setOpen(false)}
              sx={{ color: theme.palette.text.secondary }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Box id="chat-messages" sx={{
            flex: 1,
            p: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            bgcolor: theme.palette.background.default
          }}>
            {messages.map((msg, index) => (
              <Box key={index} sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  mb: 0.5
                }}>
                  <Avatar sx={{
                    width: 24,
                    height: 24,
                    bgcolor: msg.sender === 'user' 
                      ? theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]
                      : theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400],
                    fontSize: 12,
                    color: theme.palette.text.primary
                  }}>
                    {msg.sender === 'user' ? 'U' : 'B'}
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {msg.sender === 'user' ? 'You' : 'Support'}
                  </Typography>
                </Box>
                <Paper elevation={0} sx={{
                  p: 1.5,
                  borderRadius: 2,
                  maxWidth: '80%',
                  backgroundColor: msg.sender === 'user' 
                    ? theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300]
                    : theme.palette.mode === 'dark' ? theme.palette.grey[800] : theme.palette.grey[200],
                  color: theme.palette.text.primary
                }}>
                  <Typography variant="body2">
                    {msg.text}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </Box>
          
          <Box sx={{
            p: 2,
            borderTop: `1px solid ${theme.palette.divider}`,
            display: 'flex',
            gap: 1,
            bgcolor: theme.palette.background.paper
          }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              multiline
              maxRows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: theme.palette.background.default,
                  '& fieldset': {
                    borderColor: theme.palette.divider
                  },
                  '&:hover fieldset': {
                    borderColor: theme.palette.text.secondary
                  }
                }
              }}
            />
            <IconButton 
              onClick={handleSendMessage}
              disabled={!message.trim()}
              sx={{
                color: theme.palette.text.primary,
                bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
                '&:hover': {
                  bgcolor: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]
                }
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      </Slide>
      
      <IconButton
        onClick={() => setOpen(!open)}
        sx={{
          backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : theme.palette.grey[300],
          color: theme.palette.text.primary,
          width: 56,
          height: 56,
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[600] : theme.palette.grey[400]
          }
        }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </IconButton>
    </Box>
  );
};

export default ChatWidget;