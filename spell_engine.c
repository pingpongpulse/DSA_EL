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
    char* word;
} TrieNode;

// Enhanced result structure
typedef struct {
    char* word;
    double rank;
    int match_type; // 0=exact, 1=prefix, 2=fuzzy
} EnhancedResult;

// Enhanced heap for Top-5
typedef struct {
    EnhancedResult elements[TOP_K];
    int count;
} EnhancedHeap;

// ==========================================
// MODULE 2: KEYBOARD DISTANCE LOGIC
// ==========================================

const char* keyboard_rows[3] = {
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
};

int get_key_position(char c, int* row, int* col) {
    c = tolower(c);
    for (int r = 0; r < 3; r++) {
        for (int k = 0; keyboard_rows[r][k] != '\0'; k++) {
            if (keyboard_rows[r][k] == c) {
                *row = r;
                *col = k;
                return 1;
            }
        }
    }
    return 0;
}

double keyboard_distance(char a, char b) {
    if (tolower(a) == tolower(b)) {
        return 0.0;
    }
    
    int row_a, col_a, row_b, col_b;
    int found_a = get_key_position(a, &row_a, &col_a);
    int found_b = get_key_position(b, &row_b, &col_b);
    
    if (!found_a || !found_b) {
        return 1.0;
    }
    
    int row_diff = abs(row_a - row_b);
    int col_diff = abs(col_a - col_b);
    double distance = (row_diff + col_diff) / 12.0;
    
    if (distance < 0.1) distance = 0.1;
    return distance;
}

// ==========================================
// MODULE 3: ENHANCED HEAP OPERATIONS
// ==========================================

void init_enhanced_heap(EnhancedHeap* heap) {
    heap->count = 0;
}

void add_enhanced_suggestion(EnhancedHeap* heap, char* word, double score, int match_type) {
    // Check for duplicates
    for(int i = 0; i < heap->count; i++) {
        if(strcmp(heap->elements[i].word, word) == 0) {
            if (score < heap->elements[i].rank) {
                heap->elements[i].rank = score;
                heap->elements[i].match_type = match_type;
            }
            return;
        }
    }

    if (heap->count < TOP_K) {
        heap->elements[heap->count].word = strdup(word);
        heap->elements[heap->count].rank = score;
        heap->elements[heap->count].match_type = match_type;
        heap->count++;
    } else {
        int worst_idx = 0;
        for (int i = 1; i < TOP_K; i++) {
            if (heap->elements[i].rank > heap->elements[worst_idx].rank) {
                worst_idx = i;
            }
        }
        
        if (score < heap->elements[worst_idx].rank) {
            free(heap->elements[worst_idx].word);
            heap->elements[worst_idx].word = strdup(word);
            heap->elements[worst_idx].rank = score;
            heap->elements[worst_idx].match_type = match_type;
        }
    }
}

void sort_enhanced_heap(EnhancedHeap* heap) {
    for (int i = 0; i < heap->count - 1; i++) {
        for (int j = 0; j < heap->count - i - 1; j++) {
            if (heap->elements[j].rank > heap->elements[j + 1].rank) {
                EnhancedResult temp = heap->elements[j];
                heap->elements[j] = heap->elements[j + 1];
                heap->elements[j + 1] = temp;
            }
        }
    }
}

// ==========================================
// MODULE 4: TRIE OPERATIONS
// ==========================================

TrieNode* create_node() {
    TrieNode* node = (TrieNode*)malloc(sizeof(TrieNode));
    node->isEndOfWord = 0;
    node->word = NULL;
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        node->children[i] = NULL;
    }
    return node;
}

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

TrieNode* find_prefix_node(TrieNode* root, const char* prefix) {
    TrieNode* current = root;
    int len = strlen(prefix);
    
    for (int i = 0; i < len; i++) {
        int index = tolower(prefix[i]) - 'a';
        if (index < 0 || index >= 26 || !current->children[index]) {
            return NULL;
        }
        current = current->children[index];
    }
    
    return current;
}

int word_exists(TrieNode* root, const char* word) {
    TrieNode* current = root;
    int len = strlen(word);
    
    for (int i = 0; i < len; i++) {
        int index = tolower(word[i]) - 'a';
        if (index < 0 || index >= 26 || !current->children[index]) {
            return 0;
        }
        current = current->children[index];
    }
    
    return current->isEndOfWord;
}

// ==========================================
// MODULE 5: SIMILARITY ALGORITHMS
// ==========================================

double min3(double a, double b, double c) {
    double min = a;
    if (b < min) min = b;
    if (c < min) min = c;
    return min;
}

// N-gram similarity
double ngram_similarity(const char* s1, const char* s2) {
    int len1 = strlen(s1);
    int len2 = strlen(s2);
    
    if (len1 < 2 || len2 < 2) return 0.0;
    
    int bigrams1[26*26] = {0};
    int bigrams2[26*26] = {0};
    int count1 = 0, count2 = 0;
    
    for (int i = 0; i < len1 - 1; i++) {
        int c1 = tolower(s1[i]) - 'a';
        int c2 = tolower(s1[i+1]) - 'a';
        if (c1 >= 0 && c1 < 26 && c2 >= 0 && c2 < 26) {
            int idx = c1 * 26 + c2;
            if (bigrams1[idx] == 0) count1++;
            bigrams1[idx]++;
        }
    }
    
    for (int i = 0; i < len2 - 1; i++) {
        int c1 = tolower(s2[i]) - 'a';
        int c2 = tolower(s2[i+1]) - 'a';
        if (c1 >= 0 && c1 < 26 && c2 >= 0 && c2 < 26) {
            int idx = c1 * 26 + c2;
            if (bigrams2[idx] == 0) count2++;
            bigrams2[idx]++;
        }
    }
    
    int intersection = 0;
    for (int i = 0; i < 26*26; i++) {
        if (bigrams1[i] > 0 && bigrams2[i] > 0) {
            intersection++;
        }
    }
    
    int union_count = count1 + count2 - intersection;
    return union_count > 0 ? (double)intersection / union_count : 0.0;
}

// LCS length
int lcs_length(const char* s1, const char* s2) {
    int m = strlen(s1);
    int n = strlen(s2);
    
    int* prev = (int*)calloc(n + 1, sizeof(int));
    int* curr = (int*)calloc(n + 1, sizeof(int));
    
    for (int i = 1; i <= m; i++) {
        for (int j = 1; j <= n; j++) {
            if (tolower(s1[i-1]) == tolower(s2[j-1])) {
                curr[j] = prev[j-1] + 1;
            } else {
                curr[j] = (prev[j] > curr[j-1]) ? prev[j] : curr[j-1];
            }
        }
        int* temp = prev;
        prev = curr;
        curr = temp;
    }
    
    int result = prev[n];
    free(prev);
    free(curr);
    return result;
}

// Damerau-Levenshtein distance
double damerau_levenshtein(const char* s1, const char* s2) {
    int len1 = strlen(s1);
    int len2 = strlen(s2);
    
    double** d = (double**)malloc((len1 + 1) * sizeof(double*));
    for (int i = 0; i <= len1; i++) {
        d[i] = (double*)malloc((len2 + 1) * sizeof(double));
    }
    
    for (int i = 0; i <= len1; i++) d[i][0] = i;
    for (int j = 0; j <= len2; j++) d[0][j] = j;
    
    for (int i = 1; i <= len1; i++) {
        for (int j = 1; j <= len2; j++) {
            double cost = keyboard_distance(s1[i-1], s2[j-1]);
            
            d[i][j] = min3(
                d[i-1][j] + 1.0,
                d[i][j-1] + 1.0,
                d[i-1][j-1] + cost
            );
            
            if (i > 1 && j > 1 && 
                tolower(s1[i-1]) == tolower(s2[j-2]) && 
                tolower(s1[i-2]) == tolower(s2[j-1])) {
                double trans_cost = d[i-2][j-2] + keyboard_distance(s1[i-1], s2[j-1]);
                if (trans_cost < d[i][j]) {
                    d[i][j] = trans_cost;
                }
            }
        }
    }
    
    double result = d[len1][len2];
    
    for (int i = 0; i <= len1; i++) {
        free(d[i]);
    }
    free(d);
    
    return result;
}

// ==========================================
// MODULE 6: TYPO DETECTION & SCORING
// ==========================================

int count_trailing_repeats(const char* input) {
    int len = strlen(input);
    if (len < 2) return 0;
    
    char last_char = tolower(input[len - 1]);
    int count = 1;
    
    for (int i = len - 2; i >= 0 && tolower(input[i]) == last_char; i--) {
        count++;
    }
    
    return count;
}

int is_candidate_substring(const char* input, const char* candidate) {
    int input_len = strlen(input);
    int cand_len = strlen(candidate);
    
    if (cand_len > input_len) return 0;
    
    int j = 0;
    for (int i = 0; i < input_len && j < cand_len; i++) {
        if (tolower(input[i]) == tolower(candidate[j])) {
            j++;
        }
    }
    return (j == cand_len);
}

double calculate_composite_score(const char* input, const char* candidate) {
    int input_len = strlen(input);
    int cand_len = strlen(candidate);
    
    // 1. Edit distance
    double edit_dist = damerau_levenshtein(input, candidate);
    double normalized_edit = edit_dist / (double)(input_len > cand_len ? input_len : cand_len);
    
    // 2. N-gram similarity
    double ngram_sim = ngram_similarity(input, candidate);
    double ngram_score = 1.0 - ngram_sim;
    
    // 3. LCS
    int lcs = lcs_length(input, candidate);
    double lcs_ratio = (double)lcs / (double)(input_len > cand_len ? input_len : cand_len);
    double lcs_score = 1.0 - lcs_ratio;
    
    // 4. Length difference
    int len_diff = abs(input_len - cand_len);
    double len_penalty = (double)len_diff / (double)(input_len > cand_len ? input_len : cand_len);
    
    // CRITICAL: Handle trailing repeated characters
    if (input_len > cand_len) {
        int trailing_repeats = count_trailing_repeats(input);
        if (trailing_repeats > 1 && len_diff <= trailing_repeats) {
            char* trimmed = (char*)malloc(input_len);
            strncpy(trimmed, input, input_len - len_diff);
            trimmed[input_len - len_diff] = '\0';
            
            if (strcasecmp(trimmed, candidate) == 0) {
                len_penalty *= 0.1;
                normalized_edit *= 0.2;
            }
            free(trimmed);
        }
    }
    
    // 5. Prefix matching
    double prefix_bonus = 0.0;
    int prefix_match_len = 0;
    int max_check = (input_len < cand_len) ? input_len : cand_len;
    
    for (int i = 0; i < max_check; i++) {
        if (tolower(input[i]) == tolower(candidate[i])) {
            prefix_match_len++;
        } else {
            break;
        }
    }
    
    if (prefix_match_len > 0) {
        double prefix_ratio = (double)prefix_match_len / (double)cand_len;
        prefix_bonus = -0.3 * prefix_ratio;
        
        if (prefix_match_len == cand_len && input_len > cand_len) {
            prefix_bonus -= 0.4;
        }
    }
    
    // 6. Substring bonus
    double substring_bonus = 0.0;
    if (is_candidate_substring(input, candidate)) {
        substring_bonus = -0.3;
    }
    
    // 7. Trailing typo bonus
    double trailing_typo_bonus = 0.0;
    if (input_len > cand_len) {
        int trailing_repeats = count_trailing_repeats(input);
        if (trailing_repeats >= 2) {
            char* input_trimmed = (char*)malloc(cand_len + 1);
            strncpy(input_trimmed, input, cand_len);
            input_trimmed[cand_len] = '\0';
            
            if (strcasecmp(input_trimmed, candidate) == 0) {
                trailing_typo_bonus = -0.5;
            }
            free(input_trimmed);
        }
    }
    
    // Weighted combination
    double score = 
        0.25 * normalized_edit +
        0.15 * ngram_score +
        0.15 * lcs_score +
        0.15 * len_penalty +
        prefix_bonus +
        substring_bonus +
        trailing_typo_bonus;
    
    return score;
}

void generate_typo_variations(const char* input, char variations[][MAX_WORD_LENGTH], int* var_count) {
    *var_count = 0;
    int len = strlen(input);
    
    // Remove last character
    if (len > 1) {
        strcpy(variations[*var_count], input);
        variations[*var_count][len - 1] = '\0';
        (*var_count)++;
    }
    
    // Remove repeated trailing characters
    if (len > 2 && tolower(input[len-1]) == tolower(input[len-2])) {
        strcpy(variations[*var_count], input);
        int trim_pos = len - 1;
        char last = tolower(input[len-1]);
        
        while (trim_pos > 0 && tolower(variations[*var_count][trim_pos-1]) == last) {
            trim_pos--;
        }
        variations[*var_count][trim_pos] = '\0';
        (*var_count)++;
    }
    
    // Remove last 2 characters
    if (len > 2) {
        strcpy(variations[*var_count], input);
        variations[*var_count][len - 2] = '\0';
        (*var_count)++;
    }
}

// ==========================================
// MODULE 7: TRIE TRAVERSAL & SEARCH
// ==========================================

void traverse_and_score(TrieNode* node, const char* input, EnhancedHeap* results, 
                       double max_score_threshold) {
    if (!node) return;
    
    if (node->isEndOfWord && node->word) {
        double score = calculate_composite_score(input, node->word);
        
        if (score < max_score_threshold) {
            add_enhanced_suggestion(results, node->word, score, 2);
        }
    }
    
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (node->children[i]) {
            traverse_and_score(node->children[i], input, results, max_score_threshold);
        }
    }
}

void collect_prefix_words(TrieNode* node, EnhancedHeap* results, int depth, int max_depth) {
    if (!node || depth > max_depth) {
        return;
    }
    
    if (node->isEndOfWord) {
        double rank = (double)depth * 0.01;
        add_enhanced_suggestion(results, node->word, rank, 1);
    }
    
    for (int i = 0; i < ALPHABET_SIZE; i++) {
        if (node->children[i]) {
            collect_prefix_words(node->children[i], results, depth + 1, max_depth);
        }
    }
}

void get_enhanced_suggestions(TrieNode* root, const char* input, EnhancedHeap* results) {
    init_enhanced_heap(results);
    
    int input_len = strlen(input);
    if (input_len == 0) return;
    
    // Strategy 0: Check common typo patterns first
    char variations[10][MAX_WORD_LENGTH];
    int var_count;
    generate_typo_variations(input, variations, &var_count);
    
    for (int i = 0; i < var_count; i++) {
        if (word_exists(root, variations[i])) {
            add_enhanced_suggestion(results, variations[i], 0.001 * (i+1), 0);
        }
    }
    
    // Strategy 1: Exact prefix matches
    TrieNode* prefix_node = find_prefix_node(root, input);
    if (prefix_node) {
        collect_prefix_words(prefix_node, results, 0, 8);
    }
    
    // Strategy 2: Fuzzy matching
    double threshold = 0.65 + (input_len < 4 ? 0.15 : 0.0);
    traverse_and_score(root, input, results, threshold);
    
    sort_enhanced_heap(results);
}

// ==========================================
// MODULE 8: HTTP SERVER
// ==========================================

char* create_json_response(EnhancedHeap* heap) {
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

char* extract_query_param(const char* request, const char* param) {
    static char value[256];
    const char* pos = strstr(request, param);
    if (!pos) return NULL;
    
    pos += strlen(param) + 1;
    const char* start = pos;
    while (*pos && *pos != ' ' && *pos != '&' && *pos != '\r') {
        pos++;
    }
    
    int len = pos - start;
    strncpy(value, start, len);
    value[len] = '\0';
    
    return value;
}

const char* http_response_template = 
    "HTTP/1.1 200 OK\r\n"
    "Content-Type: application/json\r\n"
    "Access-Control-Allow-Origin: *\r\n"
    "Connection: close\r\n"
    "\r\n"
    "%s";

void handle_request(SOCKET client_socket, TrieNode* root) {
    char buffer[2048];
    recv(client_socket, buffer, sizeof(buffer)-1, 0);
    buffer[sizeof(buffer)-1] = '\0';
    
    if (strstr(buffer, "GET /suggest?") != NULL) {
        char* word = extract_query_param(buffer, "word");
        if (word && strlen(word) > 0) {
            EnhancedHeap suggestions;
            get_enhanced_suggestions(root, word, &suggestions);
            
            char* json_response = create_json_response(&suggestions);
            
            char full_response[4096];
            sprintf(full_response, http_response_template, json_response);
            send(client_socket, full_response, strlen(full_response), 0);
            
            for (int i = 0; i < suggestions.count; i++) {
                free(suggestions.elements[i].word);
            }
        } else {
            const char* bad_req = "HTTP/1.1 400 Bad Request\r\n\r\n{\"error\":\"Missing word\"}";
            send(client_socket, bad_req, strlen(bad_req), 0);
        }
    } else {
        const char* not_found = "HTTP/1.1 404 Not Found\r\n\r\n{\"error\":\"Not found\"}";
        send(client_socket, not_found, strlen(not_found), 0);
    }
}

void start_server(TrieNode* root) {
    WSADATA wsaData;
    SOCKET server_fd, new_socket;
    struct sockaddr_in address;
    int opt = 1;
    int addrlen = sizeof(address);
    
    WSAStartup(MAKEWORD(2,2), &wsaData);
    
    if ((server_fd = socket(AF_INET, SOCK_STREAM, 0)) == INVALID_SOCKET) {
        printf("Socket creation failed\n");
        return;
    }
    
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt)) == SOCKET_ERROR) {
        printf("Setsockopt failed\n");
        return;
    }
    
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(8080);
    
    if (bind(server_fd, (struct sockaddr *)&address, sizeof(address)) == SOCKET_ERROR) {
        printf("Bind failed\n");
        return;
    }
    
    if (listen(server_fd, 10) == SOCKET_ERROR) {
        printf("Listen failed\n");
        return;
    }
    
    printf("Server listening on http://localhost:8080/suggest?word=yourword\n");
    
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
// MODULE 9: MAIN
// ==========================================

int main() {
    printf("========================================\n");
    printf("   ENHANCED SPELL CHECKER v2.0\n");
    printf("========================================\n\n");
    
    TrieNode* root = create_node();
    
    printf("Loading dictionary...\n");
    load_dictionary_from_file(root, "allword.txt");
    printf("\n");
    
    start_server(root);
    
    return 0;
}