export const LOCATION_PERMISSIONS = {
  viewer: { manage: false },
  operator: { manage: true },
  admin: { manage: true },
};

export function getLocationPermissions(role) {
  return LOCATION_PERMISSIONS[role] ?? LOCATION_PERMISSIONS.viewer;
}

export function validateLocationInput(input) {
  const errors = {};
  for (const field of ["code", "aisle", "rack", "level"]) {
    if (!input[field]?.trim()) errors[field] = "Este campo es obligatorio.";
  }
  if (input.sortOrder !== undefined && (!Number.isInteger(input.sortOrder) || input.sortOrder < 0)) {
    errors.sortOrder = "El orden debe ser un entero igual o mayor que cero.";
  }
  return errors;
}
