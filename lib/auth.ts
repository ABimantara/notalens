export const getToken = (): string | null => {
  return localStorage.getItem('token')
}

export const getUser = () => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export const isLoggedIn = (): boolean => {
  return !!getToken()
}

export const logout = async () => {
  const token = getToken()

  // Beritahu backend (opsional, karena JWT stateless)
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  // Hapus dari localStorage (wajib)
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}