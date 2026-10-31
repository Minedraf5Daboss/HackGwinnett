import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import AuthForm from '../components/AuthForm.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Create your account"
      subtitle="It takes a minute. You can fill in the rest later."
      submitLabel="Sign up"
      passwordProps={{ autoComplete: 'new-password', minLength: 8, hint: 'At least 8 characters.' }}
      onSubmit={async (email, password) => {
        await register(email, password);
        navigate('/profile', { replace: true });
      }}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-teal-700 hover:underline">
            Log in
          </Link>
        </>
      }
    />
  );
}
