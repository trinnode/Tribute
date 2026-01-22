;; badge-nft.clar
;; Tribute Protocol - Proof of Patronage NFT
;; SIP-009 compliant NFT for patron recognition badges

;; Use local trait for devnet/simnet, will be deployed before this contract on testnet
(impl-trait .sip-009-trait.nft-trait)

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_ALREADY_MINTED (err u409))
(define-constant ERR_INVALID_BADGE_TYPE (err u400))

;; Badge types
(define-constant BADGE_SUPPORTER u1)        ;; Basic supporter
(define-constant BADGE_EARLY_BELIEVER u2)   ;; Early backer
(define-constant BADGE_CHAMPION u3)         ;; Significant supporter
(define-constant BADGE_WHALE u4)            ;; Major patron
(define-constant BADGE_LEGEND u5)           ;; Legendary status

;; Thresholds (in micro-STX, adjust for sBTC later)
(define-constant THRESHOLD_SUPPORTER u100000)        ;; 0.1 STX
(define-constant THRESHOLD_EARLY_BELIEVER u500000)   ;; 0.5 STX
(define-constant THRESHOLD_CHAMPION u1000000)        ;; 1 STX
(define-constant THRESHOLD_WHALE u10000000)          ;; 10 STX
(define-constant THRESHOLD_LEGEND u100000000)        ;; 100 STX

;; ============================================
;; NFT DEFINITION
;; ============================================

(define-non-fungible-token tribute-badge uint)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var last-token-id uint u0)
(define-data-var base-uri (string-ascii 200) "https://tribute.xyz/api/badge/")

;; ============================================
;; DATA MAPS
;; ============================================

;; Badge metadata
(define-map badge-metadata
  { token-id: uint }
  {
    badge-type: uint,
    creator: principal,
    patron: principal,
    total-contributed: uint,
    minted-at: uint
  }
)

;; Track which badges a patron has for each creator
;; Prevents duplicate badge minting for same tier
(define-map patron-badges
  { patron: principal, creator: principal, badge-type: uint }
  { token-id: uint }
)

;; Total badges by type per creator
(define-map creator-badge-counts
  { creator: principal, badge-type: uint }
  { count: uint }
)

;; Minter authorization (only splitter contract can mint)
(define-data-var authorized-minter (optional principal) none)

;; ============================================
;; SIP-009 REQUIRED FUNCTIONS
;; ============================================

;; Get the last token ID
(define-read-only (get-last-token-id)
  (ok (var-get last-token-id))
)

;; Get token URI
(define-read-only (get-token-uri (token-id uint))
  (ok (some (concat (var-get base-uri) "metadata")))
)

;; Get owner of a token
(define-read-only (get-owner (token-id uint))
  (ok (nft-get-owner? tribute-badge token-id))
)

;; Transfer a token
(define-public (transfer (token-id uint) (sender principal) (recipient principal))
  (begin
    ;; Verify sender is the owner
    (asserts! (is-eq (some sender) (nft-get-owner? tribute-badge token-id)) ERR_NOT_AUTHORIZED)
    ;; Verify sender is tx-sender
    (asserts! (is-eq sender tx-sender) ERR_NOT_AUTHORIZED)
    
    ;; Transfer the NFT
    (try! (nft-transfer? tribute-badge token-id sender recipient))
    
    ;; Emit event
    (print {
      event: "badge-transfer",
      token-id: token-id,
      from: sender,
      to: recipient,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; ============================================
;; MINTING FUNCTIONS
;; ============================================

;; Set authorized minter (only contract owner, one-time setup)
(define-public (set-authorized-minter (minter principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (var-set authorized-minter (some minter))
    (ok true)
  )
)

;; Mint a badge (called by splitter contract or authorized minter)
(define-public (mint-badge 
  (patron principal) 
  (creator principal) 
  (badge-type uint) 
  (total-contributed uint))
  (let
    (
      (token-id (+ (var-get last-token-id) u1))
      (existing-badge (map-get? patron-badges { patron: patron, creator: creator, badge-type: badge-type }))
    )
    ;; Verify caller is authorized
    (asserts! 
      (or 
        (is-eq tx-sender CONTRACT_OWNER)
        (is-eq (some tx-sender) (var-get authorized-minter))
      ) 
      ERR_NOT_AUTHORIZED
    )
    
    ;; Validate badge type
    (asserts! (and (>= badge-type u1) (<= badge-type u5)) ERR_INVALID_BADGE_TYPE)
    
    ;; Check if patron already has this badge tier for this creator
    (asserts! (is-none existing-badge) ERR_ALREADY_MINTED)
    
    ;; Mint the NFT
    (try! (nft-mint? tribute-badge token-id patron))
    
    ;; Store metadata
    (map-set badge-metadata
      { token-id: token-id }
      {
        badge-type: badge-type,
        creator: creator,
        patron: patron,
        total-contributed: total-contributed,
        minted-at: block-height
      }
    )
    
    ;; Track patron's badge
    (map-set patron-badges
      { patron: patron, creator: creator, badge-type: badge-type }
      { token-id: token-id }
    )
    
    ;; Update creator badge count
    (map-set creator-badge-counts
      { creator: creator, badge-type: badge-type }
      { count: (+ (get-badge-count creator badge-type) u1) }
    )
    
    ;; Update last token ID
    (var-set last-token-id token-id)
    
    ;; Emit event
    (print {
      event: "badge-minted",
      token-id: token-id,
      patron: patron,
      creator: creator,
      badge-type: badge-type,
      total-contributed: total-contributed,
      block-height: block-height
    })
    
    (ok token-id)
  )
)

;; ============================================
;; BADGE DETERMINATION
;; ============================================

;; Determine badge type based on contribution amount
(define-read-only (determine-badge-type (amount uint))
  (if (>= amount THRESHOLD_LEGEND)
    BADGE_LEGEND
    (if (>= amount THRESHOLD_WHALE)
      BADGE_WHALE
      (if (>= amount THRESHOLD_CHAMPION)
        BADGE_CHAMPION
        (if (>= amount THRESHOLD_EARLY_BELIEVER)
          BADGE_EARLY_BELIEVER
          (if (>= amount THRESHOLD_SUPPORTER)
            BADGE_SUPPORTER
            u0  ;; No badge
          )
        )
      )
    )
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get badge metadata
(define-read-only (get-badge-metadata (token-id uint))
  (map-get? badge-metadata { token-id: token-id })
)

;; Check if patron has a specific badge for a creator
(define-read-only (has-badge (patron principal) (creator principal) (badge-type uint))
  (is-some (map-get? patron-badges { patron: patron, creator: creator, badge-type: badge-type }))
)

;; Get patron's badge token ID for a creator
(define-read-only (get-patron-badge (patron principal) (creator principal) (badge-type uint))
  (map-get? patron-badges { patron: patron, creator: creator, badge-type: badge-type })
)

;; Get badge count for a creator
(define-read-only (get-badge-count (creator principal) (badge-type uint))
  (default-to u0 
    (get count (map-get? creator-badge-counts { creator: creator, badge-type: badge-type }))
  )
)

;; Get all badge counts for a creator
(define-read-only (get-creator-badge-summary (creator principal))
  {
    supporters: (get-badge-count creator BADGE_SUPPORTER),
    early-believers: (get-badge-count creator BADGE_EARLY_BELIEVER),
    champions: (get-badge-count creator BADGE_CHAMPION),
    whales: (get-badge-count creator BADGE_WHALE),
    legends: (get-badge-count creator BADGE_LEGEND)
  }
)

;; Get badge type name
(define-read-only (get-badge-type-name (badge-type uint))
  (if (is-eq badge-type BADGE_SUPPORTER)
    "Supporter"
    (if (is-eq badge-type BADGE_EARLY_BELIEVER)
      "Early Believer"
      (if (is-eq badge-type BADGE_CHAMPION)
        "Champion"
        (if (is-eq badge-type BADGE_WHALE)
          "Whale"
          (if (is-eq badge-type BADGE_LEGEND)
            "Legend"
            "Unknown"
          )
        )
      )
    )
  )
)

;; Get threshold for a badge type
(define-read-only (get-badge-threshold (badge-type uint))
  (if (is-eq badge-type BADGE_SUPPORTER)
    THRESHOLD_SUPPORTER
    (if (is-eq badge-type BADGE_EARLY_BELIEVER)
      THRESHOLD_EARLY_BELIEVER
      (if (is-eq badge-type BADGE_CHAMPION)
        THRESHOLD_CHAMPION
        (if (is-eq badge-type BADGE_WHALE)
          THRESHOLD_WHALE
          (if (is-eq badge-type BADGE_LEGEND)
            THRESHOLD_LEGEND
            u0
          )
        )
      )
    )
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Update base URI (only contract owner)
(define-public (set-base-uri (new-uri (string-ascii 200)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (var-set base-uri new-uri)
    (ok true)
  )
)
