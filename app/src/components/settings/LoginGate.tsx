import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import EmailIcon from "@mui/icons-material/Email";
import BlockIcon from "@mui/icons-material/Block";
import { useAuth } from "../../hooks/useAuth";

export function LoginGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured, isOwner } = useAuth();

  if (!configured) return <>{children}</>;
  if (loading) return null;
  if (!user) return <LoginForm />;

  // Ownership check still resolving
  if (isOwner === null) return null;

  // Authenticated but not the node owner -- block access
  if (!isOwner) return <AccessDenied email={user.email ?? "unknown"} />;

  return <>{children}</>;
}

function AccessDenied({ email }: { email: string }) {
  const { signOut } = useAuth();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent sx={{ p: 3, textAlign: "center" }}>
          <BlockIcon sx={{ fontSize: 48, color: "error.main", mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Access denied
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Signed in as <strong>{email}</strong>, but this account is not the
            owner of this node.
          </Typography>
          <Button variant="outlined" onClick={signOut}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}

type AuthMode = "magic-link" | "password";

export function LoginForm() {
  const { signInWithGoogle, signInWithMagicLink, signUp, signInWithPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("password");
  const [isSignUp, setIsSignUp] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleMagicLink() {
    if (!email) return;
    setSubmitting(true);
    setError(null);
    const result = await signInWithMagicLink(email);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  async function handlePassword() {
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    const result = isSignUp
      ? await signUp(email, password)
      : await signInWithPassword(email, password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  function handleSubmit() {
    if (mode === "magic-link") handleMagicLink();
    else handlePassword();
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "60vh",
      }}
    >
      <Card sx={{ maxWidth: 400, width: "100%" }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom align="center">
            {isSignUp ? "Create account" : "Sign in"}
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
            {isSignUp ? "Create an account to get started." : "Sign in to continue."}
          </Typography>

          <Button
            variant="outlined"
            fullWidth
            startIcon={<GoogleIcon />}
            onClick={signInWithGoogle}
            sx={{ mb: 2 }}
          >
            Continue with Google
          </Button>

          <Divider sx={{ my: 2 }}>or</Divider>

          {sent ? (
            <Alert severity="success">
              Check your email for a sign-in link.
            </Alert>
          ) : (
            <>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                sx={{ mb: 2 }}
              />
              {mode === "password" && (
                <TextField
                  fullWidth
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  sx={{ mb: 2 }}
                />
              )}
              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
              {mode === "password" ? (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handlePassword}
                  disabled={!email || !password || submitting}
                  disableElevation
                >
                  {submitting ? "Loading..." : isSignUp ? "Sign up" : "Sign in"}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  fullWidth
                  startIcon={<EmailIcon />}
                  onClick={handleMagicLink}
                  disabled={!email || submitting}
                  disableElevation
                >
                  {submitting ? "Sending..." : "Send magic link"}
                </Button>
              )}
              <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between" }}>
                <Button
                  size="small"
                  onClick={() => setMode(mode === "password" ? "magic-link" : "password")}
                >
                  {mode === "password" ? "Use magic link" : "Use password"}
                </Button>
                {mode === "password" && (
                  <Button size="small" onClick={() => setIsSignUp(!isSignUp)}>
                    {isSignUp ? "Have an account? Sign in" : "No account? Sign up"}
                  </Button>
                )}
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
