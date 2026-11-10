import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/store.jsx';
import { Button, Field } from '../components/ui.jsx';

export default function Auth({ mode }) {
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isReg = mode === 'register';
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(isReg ? '/auth/register' : '/auth/login', form);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="brand-mark" />
        <h1>Forja</h1>
        <p>Entrena, come bien y mide tu progreso.<br />Constancia antes que perfección.</p>
      </div>
      <form className="auth-card" onSubmit={submit}>
        <h2>{isReg ? 'Crea tu cuenta' : 'Inicia sesión'}</h2>
        {isReg && (
          <Field label="Nombre">
            <input value={form.name} onChange={set('name')} autoComplete="name" required maxLength={60} placeholder="Tu nombre" />
          </Field>
        )}
        <Field label="Email">
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required placeholder="tu@email.com" inputMode="email" autoCapitalize="none" />
        </Field>
        <Field label="Contraseña" hint={isReg ? 'Mínimo 8 caracteres' : undefined}>
          <input type="password" value={form.password} onChange={set('password')} autoComplete={isReg ? 'new-password' : 'current-password'} required minLength={isReg ? 8 : 1} placeholder="••••••••" />
        </Field>
        {error && <p className="form-error" role="alert">{error}</p>}
        <Button type="submit" block size="lg" loading={busy}>{isReg ? 'Crear cuenta' : 'Entrar'}</Button>
        <p className="auth-switch">
          {isReg ? <>¿Ya tienes cuenta? <Link to="/">Inicia sesión</Link></> : <>¿Primera vez? <Link to="/registro">Crea tu cuenta</Link></>}
        </p>
      </form>
      <p className="auth-foot">Tus datos son privados: cada cuenta solo ve su propia información.</p>
    </div>
  );
}
