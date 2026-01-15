#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <math.h>
#ifdef _WIN32
    #include <winsock2.h>
    #include <ws2tcpip.h>
    #pragma comment(lib, "ws2_32.lib")
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <arpa/inet.h>
    #include <unistd.h>
    #define SOCKET int
    #define INVALID_SOCKET -1
    #define SOCKET_ERROR -1
    #define closesocket close
#endif

// ==========================================
// MODULE 1: DATA STRUCTURES
// ==========================================

#define ALPHABET_SIZE 26
#define MAX_WORD_LENGTH 100
#define TOP_K 5

// Trie Node Structure
typedef struct TrieNode {
    struct TrieNode* children[ALPHABET_SIZE];
    int isEndOfWord;
    char* word;  // Store the complete word at end nodes
} TrieNode;

// Result structure for heap
typedef struct {
    char* word;
    double rank;  // Lower is better (edit distance cost)
} Result;

// Min-Heap for Top-5 suggestions
typedef struct {
    Result elements[TOP_K];
    int count;
} MinHeap;

// ==========================================
// MODULE 2: KEYBOARD DISTANCE LOGIC
// ==========================================

// QWERTY keyboard layout (3 rows)
const char* keyboard_rows[3] = {
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
};

// Find position of a character on the keyboard
int get_key_position(char c, int* row, int* col) {
    c = tolower(c);
    
    for (int r = 0; r < 3; r++) {
        for (int k = 0; keyboard_rows[r][k] != '\0'; k++) {
            if (keyboard_rows[r][k] == c) {
                *row = r;
                *col = k;
                return 1; // Found
            }
        }
    }
    return 0; // Not found
}

// Calculate distance between two keys on keyboard
double keyboard_distance(char a, char b) {
    // If characters are the same, no cost
    if (tolower(a) == tolower(b)) {
        return 0.0;
    }
    
    int row_a, col_a, row_b, col_b;
    
    // Get positions of both characters
    int found_a = get_key_position(a, &row_a, &col_a);
    int found_b = get_key_position(b, &row_b, &col_b);
    
    // If either character not on keyboard, use default cost
    if (!found_a || !found_b) {
        return 1.0;
    }
    
    // Calculate Manhattan distance (row diff + col diff)
    int row_diff = abs(row_a - row_b);
    int col_diff = abs(col_a - col_b);
    
    // Normalize: maximum distance on QWERTY is about 11-12
    // Scale to range [0.0, 1.0]
    double distance = (row_diff + col_diff) / 12.0;
    
    // Ensure minimum cost for different keys
    if (distance < 0.1) distance = 0.1;
    
    return distance;
}

// ==========================================
// MODULE 3: HEAP OPERATIONS (Ranker)
// ==========================================

void init_heap(MinHeap* heap) {
    heap->count = 0;
}

// Add a result to the Top-5 list
void add_suggestion(MinHeap* heap, char* word, double cost) {
    // 1. Check for duplicates (don't add "word" twice)
    for(int i = 0; i < heap->count; i++) {
        if(strcmp(heap->elements[i].word, word) == 0) return;
    }

    // 2. If we have space (< 5), just add it
    if (heap->count < TOP_K) {
        heap->elements[heap->count].word = word;
        heap->elements[heap->count].rank = cost;
        heap->count++;
    } 
    // 3. If full, see if this new word is better than the WORST one we have
    else {
        int worst_idx = 0;
        for (int i = 1; i < TOP_K; i++) {
            // Find the word with the HIGHEST cost (worst match)
            if (heap->elements[i].rank > heap->elements[worst_idx].rank) {
                worst_idx = i;
            }
        }
        
        // If new word has lower cost, replace the worst one
        if (cost < heap->elements[worst_idx].rank) {
            heap->elements[worst_idx].word = word;
            heap->elements[worst_idx].rank = cost;
        }
    }
}

// ==========================================
// MODULE 4: DICTIONARY OPERATIONS (TRIE)
// ==========================================

// Create a new Trie node
TrieNode* create_node() {
    TrieNode* node = (TrieNode*)malloc(sizeof(TrieNode));
    node->isEndOfWord = 0;
    node->word = NULL;
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        node->children[i] = NULL;
    }
    return node;
}

// Insert a single word into the Trie
void insert_word(TrieNode* root, const char* word) {
    TrieNode* curr = root;
    
    for (int i = 0; word[i] != '\0'; i++) {
        int index = tolower(word[i]) - 'a';
        if (index < 0 || index >= 26) continue;
        
        if (!curr->children[index]) {
            curr->children[index] = create_node();
        }
        curr = curr->children[index];
    }
    
    curr->isEndOfWord = 1;
    curr->word = strdup(word);
}

// Load dictionary from file
void load_dictionary_from_file(TrieNode* root, const char* filename) {
    FILE* file = fopen(filename, "r");
    
    if (!file) {
        printf("Error: Could not open file '%s'\n", filename);
        return;
    }
    
    char buffer[MAX_WORD_LENGTH];
    int word_count = 0;
    
    while (fgets(buffer, sizeof(buffer), file)) {
        buffer[strcspn(buffer, "\n")] = '\0';
        
        if (strlen(buffer) > 0) {
            insert_word(root, buffer);
            word_count++;
        }
    }
    
    fclose(file);
    printf("Dictionary loaded! Total words: %d\n", word_count);
}

// ==========================================
// MODULE 5: RECURSIVE SEARCH (The Brain)
// ==========================================

// Helper function to find minimum of 3 values
double min3(double a, double b, double c) {
    double min = a;
    if (b < min) min = b;
    if (c < min) min = c;
    return min;
}

// Recursive search through Trie calculating Levenshtein distance
void search_recursive(TrieNode* node, char tree_char, const char* target_word, 
                      double* prev_row, int word_len, MinHeap* results) {
    
    int cols = word_len + 1;
    
    // Allocate current row for dynamic programming
    double* current_row = (double*)malloc(cols * sizeof(double));
    
    // First column: cost of deleting characters from dictionary word
    current_row[0] = prev_row[0] + 1.0;
    
    double min_cost_in_row = current_row[0];
    
    // Fill the rest of the row
    for (int i = 1; i <= word_len; i++) {
        // *** USE KEYBOARD DISTANCE HERE ***
        double cost = keyboard_distance(target_word[i-1], tree_char);
        
        // Three operations:
        double insert_val = current_row[i-1] + 1.0;      // Insert
        double delete_val = prev_row[i] + 1.0;           // Delete
        double replace_val = prev_row[i-1] + cost;       // Replace (with keyboard cost)
        
        current_row[i] = min3(insert_val, delete_val, replace_val);
        
        // Track minimum cost in this row (for pruning)
        if (current_row[i] < min_cost_in_row) {
            min_cost_in_row = current_row[i];
        }
    }
    
    // If we reached end of a word and cost is acceptable, add to results
    if (node->isEndOfWord && current_row[word_len] < 3.0) {
        add_suggestion(results, node->word, current_row[word_len]);
    }
    
    // PRUNING: Only continue if there's hope of finding good matches
    if (min_cost_in_row < 3.0) {
        // Recursively search all children
        for (int k = 0; k < ALPHABET_SIZE; k++) {
            if (node->children[k]) {
                search_recursive(node->children[k], 'a' + k, target_word, 
                               current_row, word_len, results);
            }
        }
    }
    
    free(current_row);
}

// Wrapper function to start the recursive search
void get_suggestions(TrieNode* root, const char* target, MinHeap* results) {
    int len = strlen(target);
    
    // Initialize first row: [0, 1, 2, 3, ..., len]
    double* first_row = (double*)malloc((len + 1) * sizeof(double));
    for (int i = 0; i <= len; i++) {
        first_row[i] = (double)i;
    }
    
    // Start recursion from root's children
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (root->children[i]) {
            search_recursive(root->children[i], 'a' + i, target, 
                           first_row, len, results);
        }
    }
    
    free(first_row);
}

// ==========================================
// MODULE 6: HTTP SERVER
// ==========================================

// Helper function to create JSON response
char* create_json_response(MinHeap* heap) {
    static char response[2048];
    strcpy(response, "{\"suggestions\":[");
    
    for (int i = 0; i < heap->count; i++) {
        strcat(response, "\"");
        strcat(response, heap->elements[i].word);
        strcat(response, "\"");
        if (i < heap->count - 1) {
            strcat(response, ",");
        }
    }
    strcat(response, "]}");
    
    return response;
}

// Helper function to extract query parameter
char* extract_query_param(const char* request, const char* param) {
    static char value[256];
    const char* pos = strstr(request, param);
    if (!pos) return NULL;
    
    pos += strlen(param) + 1; // Move past param=value&
    const char* start = pos;
    while (*pos && *pos != ' ' && *pos != '&' && *pos != '\r') {
        pos++;
    }
    
    int len = pos - start;
    strncpy(value, start, len);
    value[len] = '\0';
    
    return value;
}

// HTTP response template
const char* http_response_template = 
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/json\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Connection: close\r\n"
    "\r\n"
    "%s";

// Handle HTTP request
void handle_request(SOCKET client_socket, TrieNode* root) {
    char buffer[2048];
    recv(client_socket, buffer, sizeof(buffer)-1, 0);
    buffer[sizeof(buffer)-1] = '\0';
    
    // Check if it's a GET request for /suggest
    if (strstr(buffer, "GET /suggest?") != NULL) {
        char* word = extract_query_param(buffer, "word");
        if (word) {
            // Get suggestions
            MinHeap suggestions;
            init_heap(&suggestions);
            get_suggestions(root, word, &suggestions);
            
            // Create JSON response
            char* json_response = create_json_response(&suggestions);
            
            // Send HTTP response
            char full_response[4096];
            sprintf(full_response, http_response_template, json_response);
            send(client_socket, full_response, strlen(full_response), 0);
        } else {
            // Bad request
            const char* bad_req = "HTTP/1.1 400 Bad Request\r\nContent-Type: application/json\r\n\r\n{\"error\":\"Missing word parameter\"}";
            send(client_socket, bad_req, strlen(bad_req), 0);
        }
    } else {
        // Serve main page or 404
        const char* not_found = "HTTP/1.1 404 Not Found\r\nContent-Type: application/json\r\n\r\n{\"error\":\"Endpoint not found\"}";
        send(client_socket, not_found, strlen(not_found), 0);
    }
}

// Start HTTP server
void start_server(TrieNode* root) {
    WSADATA wsaData;
    SOCKET server_fd, new_socket;
    struct sockaddr_in address;
    int opt = 1;
    int addrlen = sizeof(address);
    
    // Initialize Winsock
    WSAStartup(MAKEWORD(2,2), &wsaData);
    
    // Create socket
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET) {
        printf("Socket creation failed\n");
        return;
    }
    
    // Set socket options
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt)) == SOCKET_ERROR) {
        printf("Setsockopt failed\n");
        return;
    }
    
    // Configure address
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(8080);
    
    // Bind socket
    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) == SOCKET_ERROR) {
        printf("Bind failed\n");
        return;
    }
    
    // Listen
    if (listen(server_fd, 10) == SOCKET_ERROR) {
        printf("Listen failed\n");
        return;
    }
    
    printf("Server listening on http://localhost:8080/suggest?word=yourword\n");
    
    // Accept connections
    while (1) {
        if ((new_socket = accept(server_fd, (struct sockaddr *)&address, &addrlen)) != INVALID_SOCKET) {
            handle_request(new_socket, root);
            closesocket(new_socket);
        }
    }
    
    closesocket(server_fd);
    WSACleanup();
}

// ==========================================
// MODULE 7: MAIN DRIVER
// ==========================================

int main() {
    printf("========================================\n");
    printf("   SMART SPELL CHECKER WITH QWERTY API\n");
    printf("========================================\n\n");
    
    // Create root of Trie
    TrieNode* root = create_node();
    
    // Load dictionary from file
    printf("Loading dictionary...\n");
    load_dictionary_from_file(root, "allword.txt");
    printf("\n");
    
    // Start HTTP server
    start_server(root);
    
    return 0;
}

