import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import AuthForm from '../components/AuthForm.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      passwordProps={{ autoComplete: 'current-password' }}
      onSubmit={async (email, password) => {
        await login(email, password);
        navigate(location.state?.from ?? '/profile', { replace: true });
      }}
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-teal-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}
