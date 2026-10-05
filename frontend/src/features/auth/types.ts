export interface LoginData {
    username: string;
    password: string;
}

export interface AuthUser {
    id: number;
    dni: string;
    nroLegajo: string;
    nombre: string;
    apellido: string;
    email: string;
    username: string;
    operar: boolean;
    administrar: boolean;
    activo: boolean;
    capacidades: string[];
    role_name: string;
    role_id: number;
}

export interface AuthContextType {
    currentUser: AuthUser | null;
    isLoading: boolean;
    error: string | null;
    isAuthenticated: boolean;
    login: (loginData: LoginData) => Promise<boolean>;
    logout: () => Promise<void>;
    refreshCurrentUser: () => Promise<void>; // <--- ¡Añadí esta línea acá!
}