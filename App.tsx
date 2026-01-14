import React from 'react';
import { useAuth } from './src/frontend/contexts/AuthContext';
import LoginForm from './src/frontend/components/auth/LoginForm';
import AppMain from './AppMain';

const App: React.FC = () => {
  const { user, isLoading, login, register } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700">
        <div className="text-white text-2xl">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onLogin={login} onRegister={register} />;
  }

  return <AppMain />;
};

export default App;
