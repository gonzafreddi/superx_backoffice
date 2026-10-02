export function validateUserData({ email, name, phone }) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim().length > 254) return "Ingresá un email válido.";
  if (name && name.trim().length > 120) return "El nombre admite hasta 120 caracteres.";
  if (phone && (phone.trim().length < 7 || phone.trim().length > 40 || !/^[0-9 +()-]+$/.test(phone.trim()))) return "Ingresá un teléfono válido de entre 7 y 40 caracteres.";
  return "";
}
export function validateNewPassword(password, confirmation) {
  if (password.length < 8 || password.length > 72) return "La contraseña debe tener entre 8 y 72 caracteres.";
  if (password !== confirmation) return "Las contraseñas no coinciden.";
  return "";
}
export function userOperationError(status, operation) {
  if (status === 409) return operation === "edit" ? "Ya existe un usuario con ese email." : "Tiene que quedar al menos un administrador activo.";
  if (status === 400) return operation === "status" ? "No podés desactivar tu propia cuenta." : "Revisá los datos ingresados e intentá nuevamente.";
  if (status === 403) return "No tenés permiso para gestionar usuarios.";
  return "No pudimos completar la operación. Intentá nuevamente.";
}
