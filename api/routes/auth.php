<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../vendor/autoload.php';

use Firebase\JWT\JWT;

/**
 * Authentication routes
 */
class AuthRoutes {
    private $db;
    private $secret_key;

    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
        $this->secret_key = $_ENV['JWT_SECRET'] ?? 'your-secret-key-here';
    }

    /**
     * Handle authentication routes
     */
    public function handleRequest($method, $path) {
        switch ($path) {
            case '/register':
                if ($method === 'POST') {
                    $this->register();
                }
                break;
            case '/login':
                if ($method === 'POST') {
                    $this->login();
                }
                break;
            default:
                http_response_code(404);
                echo json_encode(['message' => 'Route not found']);
        }
    }

    /**
     * Register new user
     */
    private function register() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'user';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'Username and password are required']);
            return;
        }

        try {
            // Check if user already exists
            $stmt = $this->db->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$username]);
            
            if ($stmt->fetch()) {
                http_response_code(400);
                echo json_encode(['message' => 'Username already exists']);
                return;
            }

            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            // Insert new user
            $stmt = $this->db->prepare("
                INSERT INTO users (id, username, password, role, created_at) 
                VALUES (UUID(), ?, ?, ?, NOW())
            ");
            $stmt->execute([$username, $hashedPassword, $role]);

            // Get the created user
            $stmt = $this->db->prepare("SELECT id, username, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            // Generate JWT token
            $payload = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'exp' => time() + (24 * 60 * 60) // 24 hours
            ];

            $token = JWT::encode($payload, $this->secret_key, 'HS256');

            echo json_encode(['token' => $token]);

        } catch (Exception $e) {
            error_log("Registration error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }

    /**
     * Login user
     */
    private function login() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';

        if (empty($username) || empty($password)) {
            http_response_code(400);
            echo json_encode(['message' => 'Username and password are required']);
            return;
        }

        try {
            // Get user from database
            $stmt = $this->db->prepare("SELECT id, username, password, role FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if (!$user || !password_verify($password, $user['password'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid credentials']);
                return;
            }

            // Generate JWT token
            $payload = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role' => $user['role'],
                'exp' => time() + (24 * 60 * 60) // 24 hours
            ];

            $token = JWT::encode($payload, $this->secret_key, 'HS256');

            echo json_encode(['token' => $token]);

        } catch (Exception $e) {
            error_log("Login error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['message' => 'Server error']);
        }
    }
}
?>