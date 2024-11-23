import React from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Link
} from '@mui/material';
import { useAuth0 } from "@auth0/auth0-react";

function Home() {
  const {
    user,
    isAuthenticated,
    loginWithRedirect,
    logout,
  } = useAuth0();

  return (
    <div>
      {/* Hero Section */}
      <Box 
        sx={{ 
          bgcolor: 'background.paper', 
          pt: 8, 
          pb: 6, 
        }}
      >
        <Container maxWidth="sm">
          <Typography
            component="h1"
            variant="h2"
            align="center"
            color="text.primary"
            gutterBottom  

          >
            Unlock  
 the Power of the Word 
          </Typography>
          <Typography variant="h5" align="center" color="text.secondary" paragraph>
            Memorize Bible verses effortlessly with our speech-to-text technology.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            {!isAuthenticated && (<Button variant="contained" color="primary" sx={{ mr: 2 }} onClick={() => loginWithRedirect()}>
              Log In
            </Button>)
            }
            {isAuthenticated && (<Button component={Link} to="/study" href="/study" variant="contained" color="primary" sx={{ mr: 2 }}>
              Get Studying
            </Button>)
            }
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container sx={{ py: 8 }} maxWidth="md">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">  

                  Speech-to-Text  
 Memorization
                </Typography>
                <Typography>
                  Say the verses out loud and let our app do the rest.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  Search for your favorite topics or verses.
                </Typography>
                <Typography>
                  Whether it is brushing up on parts of the Word you already know or you are new to His Word this app will help you write the Word of God on your heart.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  Save your current verse
                </Typography>
                <Typography>
                  Once you select a verse using the advanced search feature rest assured when you come back you can pick up where you left off.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Testimonials Section */}
      {/*
      <Box sx={{ bgcolor: 'background.paper', pt: 8, pb: 6 }}>
        <Container maxWidth="md">
        </Container>
      </Box>
      */}

      {/* About Us Section */}
      <Container sx={{ py: 8 }} maxWidth="md">
        <Typography>
          Faith Forge Academy was co-founded by Lucas Pearson, Adam Makinson, and Mike Sumpter during a Christian hackaton called <Link href="https://hack.indigitous.org/">HACK</Link> by <Link href="https://indigitous.org/">Indigitous</Link>.
          With a heart of teens and the Word of God we decided the best way to help the next generation write the Word of God
          on there hearts was a voice to text app that would help them study His Word.
        </Typography>
      </Container>

      {/* Call to Action Section */}
      <Box sx={{ bgcolor: 'background.paper', pt: 8, pb: 6 }}>
        <Container maxWidth="sm">
          <Typography variant="h5" align="center" color="text.secondary" paragraph>  
            Start your scripture memorization journey today!
          </Typography>
        </Container>
      </Box>
    </div>
  );
}

export default Home;
