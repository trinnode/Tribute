;; registry.clar
;; Tribute Protocol - Identity Registry
;; Maps social identities (hashed handles) to Stacks wallet addresses

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_ALREADY_REGISTERED (err u409))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_INVALID_PLATFORM (err u400))
(define-constant ERR_ALREADY_VERIFIED (err u410))

;; Supported platforms
(define-constant PLATFORM_TWITTER "twitter")
(define-constant PLATFORM_YOUTUBE "youtube")
(define-constant PLATFORM_GITHUB "github")

;; ============================================
;; DATA MAPS
;; ============================================

;; Maps social-hash -> registration data
(define-map registrations
  { social-hash: (buff 32) }
  {
    principal: principal,
    platform: (string-ascii 20),
    registered-at: uint,
    verified: bool
  }
)

;; Reverse lookup: principal -> social-hash
(define-map principal-to-social
  { principal: principal }
  { social-hash: (buff 32) }
)

;; Track verification proofs
(define-map verification-proofs
  { social-hash: (buff 32) }
  {
    proof-hash: (buff 32),
    verified-at: uint
  }
)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var total-registrations uint u0)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Validate platform string
(define-private (is-valid-platform (platform (string-ascii 20)))
  (or 
    (is-eq platform PLATFORM_TWITTER)
    (or 
      (is-eq platform PLATFORM_YOUTUBE)
      (is-eq platform PLATFORM_GITHUB)
    )
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Register a social identity
;; @param social-hash: SHA-256 hash of "platform:handle" (e.g., "twitter:satoshi")
;; @param platform: The social platform (twitter, youtube, github)
(define-public (register (social-hash (buff 32)) (platform (string-ascii 20)))
  (let
    (
      (existing (map-get? registrations { social-hash: social-hash }))
      (caller-registration (map-get? principal-to-social { principal: tx-sender }))
    )
    ;; Validate platform
    (asserts! (is-valid-platform platform) ERR_INVALID_PLATFORM)
    
    ;; Check if social-hash is already registered
    (asserts! (is-none existing) ERR_ALREADY_REGISTERED)
    
    ;; Check if caller already has a registration (one per principal for MVP)
    (asserts! (is-none caller-registration) ERR_ALREADY_REGISTERED)
    
    ;; Create registration
    (map-set registrations
      { social-hash: social-hash }
      {
        principal: tx-sender,
        platform: platform,
        registered-at: block-height,
        verified: false
      }
    )
    
    ;; Create reverse lookup
    (map-set principal-to-social
      { principal: tx-sender }
      { social-hash: social-hash }
    )
    
    ;; Increment counter
    (var-set total-registrations (+ (var-get total-registrations) u1))
    
    ;; Emit event
    (print {
      event: "registration",
      social-hash: social-hash,
      principal: tx-sender,
      platform: platform,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; Verify a registration with proof
;; @param social-hash: The registered social hash
;; @param proof-hash: Hash of the verification proof (e.g., hash of tweet containing wallet address)
(define-public (verify (social-hash (buff 32)) (proof-hash (buff 32)))
  (let
    (
      (registration (unwrap! (map-get? registrations { social-hash: social-hash }) ERR_NOT_FOUND))
    )
    ;; Only the registered principal can verify
    (asserts! (is-eq tx-sender (get principal registration)) ERR_NOT_AUTHORIZED)
    
    ;; Cannot verify twice
    (asserts! (not (get verified registration)) ERR_ALREADY_VERIFIED)
    
    ;; Update registration to verified
    (map-set registrations
      { social-hash: social-hash }
      (merge registration { verified: true })
    )
    
    ;; Store verification proof
    (map-set verification-proofs
      { social-hash: social-hash }
      {
        proof-hash: proof-hash,
        verified-at: block-height
      }
    )
    
    ;; Emit event
    (print {
      event: "verification",
      social-hash: social-hash,
      principal: tx-sender,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; Update registration (change wallet address)
;; Only callable by the current registered principal
(define-public (update-principal (social-hash (buff 32)) (new-principal principal))
  (let
    (
      (registration (unwrap! (map-get? registrations { social-hash: social-hash }) ERR_NOT_FOUND))
    )
    ;; Only current owner can update
    (asserts! (is-eq tx-sender (get principal registration)) ERR_NOT_AUTHORIZED)
    
    ;; Remove old reverse lookup
    (map-delete principal-to-social { principal: tx-sender })
    
    ;; Update registration
    (map-set registrations
      { social-hash: social-hash }
      (merge registration { 
        principal: new-principal,
        verified: false  ;; Require re-verification after change
      })
    )
    
    ;; Create new reverse lookup
    (map-set principal-to-social
      { principal: new-principal }
      { social-hash: social-hash }
    )
    
    ;; Emit event
    (print {
      event: "principal-updated",
      social-hash: social-hash,
      old-principal: tx-sender,
      new-principal: new-principal,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get principal by social hash
(define-read-only (get-principal (social-hash (buff 32)))
  (match (map-get? registrations { social-hash: social-hash })
    registration (some (get principal registration))
    none
  )
)

;; Get full registration data
(define-read-only (get-registration (social-hash (buff 32)))
  (map-get? registrations { social-hash: social-hash })
)

;; Get social hash by principal (reverse lookup)
(define-read-only (get-social-hash (user principal))
  (match (map-get? principal-to-social { principal: user })
    data (some (get social-hash data))
    none
  )
)

;; Check if a social hash is registered
(define-read-only (is-registered (social-hash (buff 32)))
  (is-some (map-get? registrations { social-hash: social-hash }))
)

;; Check if a social hash is verified
(define-read-only (is-verified (social-hash (buff 32)))
  (match (map-get? registrations { social-hash: social-hash })
    registration (get verified registration)
    false
  )
)

;; Get total registrations
(define-read-only (get-total-registrations)
  (var-get total-registrations)
)

;; Get verification proof
(define-read-only (get-verification-proof (social-hash (buff 32)))
  (map-get? verification-proofs { social-hash: social-hash })
)
