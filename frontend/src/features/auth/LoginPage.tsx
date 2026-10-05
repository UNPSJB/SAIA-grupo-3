import { useState } from 'react';
import { Card, Form, Button, Alert, Container } from 'react-bootstrap';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { LoadingSpinner } from '../../shared/components/LoadingSpinner';

export function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { isAuthenticated, isLoading, login, error } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await login({ username, password });
    };

    if (isLoading) return <div className="vh-100 d-flex align-items-center"><LoadingSpinner mensaje="Autenticando..." /></div>;
    if (isAuthenticated) return <Navigate to="/" replace />;

    return (
        <Container fluid className="d-flex justify-content-center align-items-center vh-100 bg-body-tertiary">
            <Card style={{ width: '420px' }} className="shadow-lg border-0 rounded-4">
                <Card.Body className="p-5">
                    <div className="text-center mb-4">
                        <h3 className="fw-bold text-primary">SAIA</h3>
                        <p className="text-muted small">Sistema de Apoyo a la Inocuidad Alimentaria</p>
                    </div>
                    {error && <Alert variant="danger" className="small py-2">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                            <Form.Label className="small fw-semibold text-muted">Usuario (Email, DNI o Username)</Form.Label>
                            <Form.Control type="text" required value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
                        </Form.Group>
                        <Form.Group className="mb-4">
                            <Form.Label className="small fw-semibold text-muted">Contraseña</Form.Label>
                            <Form.Control type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100 py-2 fw-semibold">Ingresar al sistema</Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
}