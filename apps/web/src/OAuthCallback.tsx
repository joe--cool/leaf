import { Box, Container, Heading, Spinner, Stack, Text } from '@chakra-ui/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearToken, setRefreshToken, setToken } from './api';

export function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('token');
    const refreshToken = params.get('refreshToken');

    if (!accessToken || !refreshToken) {
      clearToken();
      navigate('/', { replace: true });
      return;
    }

    setToken(accessToken);
    setRefreshToken(refreshToken);
    navigate('/', { replace: true });
  }, [navigate]);

  return (
    <Container maxW="container.sm" py={16}>
      <Box bg="white" borderRadius="lg" p={8} boxShadow="sm">
        <Stack spacing={4} align="center">
          <Spinner color="teal.500" />
          <Heading size="md">Completing sign in</Heading>
          <Text color="gray.600">You will be redirected automatically.</Text>
        </Stack>
      </Box>
    </Container>
  );
}
