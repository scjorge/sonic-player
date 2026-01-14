import React, { useState } from 'react';
import { User as UserIcon, Users, Shield, X, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { User } from '../../types/auth';
import showToast from '../utils/toast';

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const loadUsers = async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const userList = await authService.listUsers();
      setUsers(userList);
      setShowModal(true);
    } catch (error) {
      showToast('Erro ao carregar usuários', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      await authService.toggleUserStatus(userId, !isActive);
      showToast(
        `Usuário ${!isActive ? 'ativado' : 'desativado'} com sucesso`,
        'success'
      );
      loadUsers();
    } catch (error) {
      showToast('Erro ao atualizar usuário', 'error');
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <button
        onClick={loadUsers}
        disabled={isLoading}
        className="p-1.5 text-zinc-400 hover:text-purple-400 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
        title="Gerenciar Usuários"
      >
        <Users size={16} />
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Users className="text-purple-600" size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">
                    Gerenciar Usuários
                  </h2>
                  <p className="text-sm text-gray-600">
                    Total de {users.length} usuário(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div
                        className={`p-3 rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100'
                            : 'bg-blue-100'
                        }`}
                      >
                        {user.role === 'admin' ? (
                          <Shield
                            className={
                              user.role === 'admin'
                                ? 'text-purple-600'
                                : 'text-blue-600'
                            }
                            size={24}
                          />
                        ) : (
                          <UserIcon
                            className="text-blue-600"
                            size={24}
                          />
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800">
                            {user.username}
                          </h3>
                          {user.role === 'admin' && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                              Admin
                            </span>
                          )}
                          {user.id === currentUser?.id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Você
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.createdAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            Criado em:{' '}
                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div
                          className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle size={16} />
                              <span className="text-sm font-medium">Ativo</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={16} />
                              <span className="text-sm font-medium">Inativo</span>
                            </>
                          )}
                        </div>

                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() =>
                              handleToggleStatus(user.id, user.isActive || false)
                            }
                            className={`px-4 py-2 rounded-lg font-medium transition ${
                              user.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {user.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
