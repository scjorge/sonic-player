import React, { useState } from 'react';
import { User as UserIcon, Users, Shield, X, CheckCircle, XCircle, UserPlus, Edit2, Key, Mail, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { authService } from '../../services/authService';
import { User } from '../../types/auth';
import showToast from '../utils/toast';

interface EditUserData {
  userId: string;
  username: string;
  email: string;
}

interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<EditUserData | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [createData, setCreateData] = useState<CreateUserData>({
    username: '',
    email: '',
    password: '',
    role: 'user'
  });

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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createData.username || !createData.email || !createData.password) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    if (createData.password.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    try {
      await authService.createUser(
        createData.username,
        createData.email,
        createData.password,
        createData.role
      );
      showToast('Usuário criado com sucesso!', 'success');
      setShowCreateModal(false);
      setCreateData({ username: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao criar usuário',
        'error'
      );
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingUser) return;

    if (!editingUser.username || !editingUser.email) {
      showToast('Preencha todos os campos', 'error');
      return;
    }

    try {
      await authService.adminUpdateUser(
        editingUser.userId,
        editingUser.username,
        editingUser.email
      );
      showToast('Usuário atualizado com sucesso!', 'success');
      setShowEditModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao atualizar usuário',
        'error'
      );
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPassword) {
      showToast('Digite a nova senha', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    try {
      await authService.adminResetPassword(resetPasswordUserId, newPassword);
      showToast('Senha resetada com sucesso!', 'success');
      setShowResetPasswordModal(false);
      setResetPasswordUserId('');
      setNewPassword('');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao resetar senha',
        'error'
      );
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser({
      userId: user.id,
      username: user.username,
      email: user.email
    });
    setShowEditModal(true);
  };

  const openResetPasswordModal = (userId: string) => {
    setResetPasswordUserId(userId);
    setShowResetPasswordModal(true);
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

      {/* Main Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[80vh] overflow-hidden flex flex-col">
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
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
                >
                  <UserPlus size={18} />
                  Novo Usuário
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X size={24} />
                </button>
              </div>
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
                          <Shield className="text-purple-600" size={24} />
                        ) : (
                          <UserIcon className="text-blue-600" size={24} />
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
                            <CheckCircle size={16} />
                          ) : (
                            <XCircle size={16} />
                          )}
                          <span className="text-sm font-medium">
                            {user.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleStatus(user.id, user.isActive)}
                            disabled={user.id === currentUser?.id}
                            className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                              user.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {user.isActive ? 'Desativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar usuário"
                          >
                            <Edit2 size={18} />
                          </button>
                          
                          <button
                            onClick={() => openResetPasswordModal(user.id)}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Resetar senha"
                          >
                            <Key size={18} />
                          </button>


                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <UserPlus className="text-purple-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Criar Novo Usuário
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateData({ username: '', email: '', password: '', role: 'user' });
                }}
                className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={createData.username}
                  onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-black"
                  placeholder="Digite o nome de usuário"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={createData.email}
                  onChange={(e) => setCreateData({ ...createData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-black"
                  placeholder="usuario@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={createData.password}
                  onChange={(e) => setCreateData({ ...createData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-black"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Conta
                </label>
                <select
                  value={createData.role}
                  onChange={(e) => setCreateData({ ...createData, role: e.target.value as 'user' | 'admin' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-black"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateData({ username: '', email: '', password: '', role: 'user' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <UserPlus size={18} />
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Edit2 className="text-blue-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Editar Usuário
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de Usuário
                </label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black"
                  placeholder="Digite o nome de usuário"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail size={16} />
                  Email
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-black"
                  placeholder="usuario@email.com"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Key className="text-orange-600" size={24} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                  Resetar Senha
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordUserId('');
                  setNewPassword('');
                }}
                className="text-gray-500 hover:text-gray-700 transition p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                  placeholder="Digite a nova senha"
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetPasswordUserId('');
                    setNewPassword('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium flex items-center justify-center gap-2"
                >
                  <Key size={18} />
                  Resetar Senha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default UserManagement;
