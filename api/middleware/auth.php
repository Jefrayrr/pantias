<?php
require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Authentication middleware
 */
class AuthMiddleware {
    private $secret_key;

    public function __construct() {
        $this->secret_key = $_ENV['JWT_SECRET'] ?? 'your-secret-key-here';
    }

    /**
     * Authenticate JWT token
     */
    public function authenticate() {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader)) {
            http_response_code(401);
            echo json_encode(['message' => 'No token provided']);
            exit();
        }

        // Extract token from "Bearer <token>"
        $token = str_replace('Bearer ', '', $authHeader);
        
        try {
            $decoded = JWT::decode($token, new Key($this->secret_key, 'HS256'));
            return (array) $decoded;
        } catch (Exception $e) {
            http_response_code(403);
            echo json_encode(['message' => 'Invalid token']);
            exit();
        }
    }

    /**
     * Check if user has required role
     */
    public function requireRole($user, $requiredRole) {
        if ($user['role'] !== $requiredRole) {
            http_response_code(403);
            echo json_encode(['message' => 'Insufficient permissions']);
            exit();
        }
    }
}
?>