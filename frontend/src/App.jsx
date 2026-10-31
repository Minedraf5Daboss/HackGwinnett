import { Route, Routes } from 'react-router';
import Layout from './components/Layout.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Clinics from './pages/Clinics.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Passport from './pages/Passport.jsx';
import Profile from './pages/Profile.jsx';
import Register from './pages/Register.jsx';
import SharedPassport from './pages/SharedPassport.jsx';
import Simplify from './pages/Simplify.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="clinics" element={<Clinics />} />
        <Route path="simplify" element={<Simplify />} />
        <Route path="shared/:token" element={<SharedPassport />} />
        <Route
          path="passport"
          element={
            <RequireAuth>
              <Passport />
            </RequireAuth>
          }
        />
        <Route
          path="profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
