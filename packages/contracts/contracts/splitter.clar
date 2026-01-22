;; splitter.clar
;; Tribute Protocol - Tip Splitting Engine
;; Handles automatic revenue splitting for creator teams

;; ============================================
;; CONSTANTS
;; ============================================

(define-constant CONTRACT_OWNER tx-sender)

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u401))
(define-constant ERR_INVALID_SPLIT (err u400))
(define-constant ERR_NOT_FOUND (err u404))
(define-constant ERR_TRANSFER_FAILED (err u500))
(define-constant ERR_ZERO_AMOUNT (err u402))

;; Split configuration limits
(define-constant BASIS_POINTS u10000) ;; 100.00% = 10000 basis points
(define-constant MIN_TIP_AMOUNT u1000) ;; Minimum tip in micro-units

;; ============================================
;; DATA MAPS
;; ============================================

;; Simple split configuration - creator can set up to 3 split recipients
;; Primary recipient (creator) is implicit - remaining share after splits
(define-map split-configs
  { owner: principal }
  {
    split1-recipient: (optional principal),
    split1-share: uint,
    split2-recipient: (optional principal),
    split2-share: uint,
    split3-recipient: (optional principal),
    split3-share: uint,
    active: bool
  }
)

;; Tip statistics per creator
(define-map tip-stats
  { creator: principal }
  {
    total-received: uint,
    tip-count: uint,
    last-tip-at: uint
  }
)

;; Tip statistics per fan
(define-map fan-stats
  { fan: principal, creator: principal }
  {
    total-sent: uint,
    tip-count: uint,
    last-tip-at: uint
  }
)

;; ============================================
;; DATA VARIABLES
;; ============================================

(define-data-var total-tips-processed uint u0)
(define-data-var total-volume uint u0)

;; Protocol fee (in basis points, 0 = no fee for MVP)
(define-data-var protocol-fee uint u0)
(define-data-var fee-recipient principal CONTRACT_OWNER)

;; ============================================
;; PRIVATE FUNCTIONS
;; ============================================

;; Calculate split amount
(define-private (calculate-split (amount uint) (share uint))
  (/ (* amount share) BASIS_POINTS)
)

;; Update creator stats
(define-private (update-creator-stats (creator principal) (amount uint))
  (let
    (
      (current-stats (default-to 
        { total-received: u0, tip-count: u0, last-tip-at: u0 }
        (map-get? tip-stats { creator: creator })
      ))
    )
    (map-set tip-stats
      { creator: creator }
      {
        total-received: (+ (get total-received current-stats) amount),
        tip-count: (+ (get tip-count current-stats) u1),
        last-tip-at: block-height
      }
    )
  )
)

;; Update fan stats
(define-private (update-fan-stats (fan principal) (creator principal) (amount uint))
  (let
    (
      (current-stats (default-to 
        { total-sent: u0, tip-count: u0, last-tip-at: u0 }
        (map-get? fan-stats { fan: fan, creator: creator })
      ))
    )
    (map-set fan-stats
      { fan: fan, creator: creator }
      {
        total-sent: (+ (get total-sent current-stats) amount),
        tip-count: (+ (get tip-count current-stats) u1),
        last-tip-at: block-height
      }
    )
  )
)

;; ============================================
;; PUBLIC FUNCTIONS
;; ============================================

;; Configure split for a creator
;; Shares are in basis points. Creator gets the remainder.
;; Example: split1-share=2000 (20%), split2-share=1000 (10%) = creator gets 70%
(define-public (configure-split 
  (split1-recipient (optional principal))
  (split1-share uint)
  (split2-recipient (optional principal))
  (split2-share uint)
  (split3-recipient (optional principal))
  (split3-share uint))
  (let
    (
      (total-split-share (+ split1-share (+ split2-share split3-share)))
    )
    ;; Validate total split share is less than 100%
    (asserts! (< total-split-share BASIS_POINTS) ERR_INVALID_SPLIT)
    
    ;; If recipient is some, share must be > 0
    (asserts! (or (is-none split1-recipient) (> split1-share u0)) ERR_INVALID_SPLIT)
    (asserts! (or (is-none split2-recipient) (> split2-share u0)) ERR_INVALID_SPLIT)
    (asserts! (or (is-none split3-recipient) (> split3-share u0)) ERR_INVALID_SPLIT)
    
    ;; Store configuration
    (map-set split-configs
      { owner: tx-sender }
      {
        split1-recipient: split1-recipient,
        split1-share: split1-share,
        split2-recipient: split2-recipient,
        split2-share: split2-share,
        split3-recipient: split3-recipient,
        split3-share: split3-share,
        active: true
      }
    )
    
    ;; Emit event
    (print {
      event: "split-configured",
      owner: tx-sender,
      total-split-percentage: total-split-share,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; Disable splits (creator receives 100%)
(define-public (disable-split)
  (begin
    (map-set split-configs
      { owner: tx-sender }
      {
        split1-recipient: none,
        split1-share: u0,
        split2-recipient: none,
        split2-share: u0,
        split3-recipient: none,
        split3-share: u0,
        active: false
      }
    )
    
    (print {
      event: "split-disabled",
      owner: tx-sender,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; Execute a tip with automatic splitting
(define-public (execute-tip (recipient principal) (amount uint))
  (let
    (
      (split-config (map-get? split-configs { owner: recipient }))
      (fee (var-get protocol-fee))
      (fee-amount (if (> fee u0) (calculate-split amount fee) u0))
      (net-amount (- amount fee-amount))
    )
    ;; Validate amount
    (asserts! (>= amount MIN_TIP_AMOUNT) ERR_ZERO_AMOUNT)
    
    ;; Charge protocol fee if applicable
    (if (> fee-amount u0)
      (try! (stx-transfer? fee-amount tx-sender (var-get fee-recipient)))
      true
    )
    
    ;; Check if recipient has split configured
    (match split-config
      config
        (if (get active config)
          (try! (distribute-with-config net-amount recipient config))
          (try! (stx-transfer? net-amount tx-sender recipient))
        )
      (try! (stx-transfer? net-amount tx-sender recipient))
    )
    
    ;; Update stats
    (update-creator-stats recipient net-amount)
    (update-fan-stats tx-sender recipient amount)
    
    ;; Update global stats
    (var-set total-tips-processed (+ (var-get total-tips-processed) u1))
    (var-set total-volume (+ (var-get total-volume) amount))
    
    ;; Emit event
    (print {
      event: "tip-sent",
      from: tx-sender,
      to: recipient,
      amount: amount,
      net-amount: net-amount,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; Distribute with configured splits
(define-private (distribute-with-config 
  (amount uint)
  (creator principal)
  (config {
    split1-recipient: (optional principal),
    split1-share: uint,
    split2-recipient: (optional principal),
    split2-share: uint,
    split3-recipient: (optional principal),
    split3-share: uint,
    active: bool
  }))
  (let
    (
      (split1-amount (calculate-split amount (get split1-share config)))
      (split2-amount (calculate-split amount (get split2-share config)))
      (split3-amount (calculate-split amount (get split3-share config)))
      (creator-amount (- amount (+ split1-amount (+ split2-amount split3-amount))))
    )
    ;; Transfer to split recipients if configured
    (match (get split1-recipient config)
      r1 (try! (stx-transfer? split1-amount tx-sender r1))
      true
    )
    
    (match (get split2-recipient config)
      r2 (try! (stx-transfer? split2-amount tx-sender r2))
      true
    )
    
    (match (get split3-recipient config)
      r3 (try! (stx-transfer? split3-amount tx-sender r3))
      true
    )
    
    ;; Transfer remainder to creator
    (try! (stx-transfer? creator-amount tx-sender creator))
    
    (ok true)
  )
)

;; Direct tip without splits (simpler, lower gas)
(define-public (tip-direct (recipient principal) (amount uint))
  (begin
    (asserts! (>= amount MIN_TIP_AMOUNT) ERR_ZERO_AMOUNT)
    
    (try! (stx-transfer? amount tx-sender recipient))
    
    (update-creator-stats recipient amount)
    (update-fan-stats tx-sender recipient amount)
    
    (var-set total-tips-processed (+ (var-get total-tips-processed) u1))
    (var-set total-volume (+ (var-get total-volume) amount))
    
    (print {
      event: "tip-direct",
      from: tx-sender,
      to: recipient,
      amount: amount,
      block-height: block-height
    })
    
    (ok true)
  )
)

;; ============================================
;; ADMIN FUNCTIONS
;; ============================================

;; Update protocol fee (only contract owner)
(define-public (set-protocol-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (<= new-fee u500) ERR_INVALID_SPLIT) ;; Max 5% fee
    (var-set protocol-fee new-fee)
    (ok true)
  )
)

;; Update fee recipient (only contract owner)
(define-public (set-fee-recipient (new-recipient principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (var-set fee-recipient new-recipient)
    (ok true)
  )
)

;; ============================================
;; READ-ONLY FUNCTIONS
;; ============================================

;; Get split configuration for a creator
(define-read-only (get-split-config (owner principal))
  (map-get? split-configs { owner: owner })
)

;; Get tip stats for a creator
(define-read-only (get-creator-stats (creator principal))
  (default-to 
    { total-received: u0, tip-count: u0, last-tip-at: u0 }
    (map-get? tip-stats { creator: creator })
  )
)

;; Get fan stats for a specific fan-creator pair
(define-read-only (get-fan-stats (fan principal) (creator principal))
  (default-to 
    { total-sent: u0, tip-count: u0, last-tip-at: u0 }
    (map-get? fan-stats { fan: fan, creator: creator })
  )
)

;; Get global statistics
(define-read-only (get-global-stats)
  {
    total-tips: (var-get total-tips-processed),
    total-volume: (var-get total-volume),
    protocol-fee: (var-get protocol-fee)
  }
)

;; Preview what splits would look like for a given amount
(define-read-only (preview-split (owner principal) (amount uint))
  (match (map-get? split-configs { owner: owner })
    config
      (if (get active config)
        (let
          (
            (split1-amount (calculate-split amount (get split1-share config)))
            (split2-amount (calculate-split amount (get split2-share config)))
            (split3-amount (calculate-split amount (get split3-share config)))
            (creator-amount (- amount (+ split1-amount (+ split2-amount split3-amount))))
          )
          (ok {
            creator-receives: creator-amount,
            split1-receives: split1-amount,
            split2-receives: split2-amount,
            split3-receives: split3-amount
          })
        )
        (ok {
          creator-receives: amount,
          split1-receives: u0,
          split2-receives: u0,
          split3-receives: u0
        })
      )
    (ok {
      creator-receives: amount,
      split1-receives: u0,
      split2-receives: u0,
      split3-receives: u0
    })
  )
)
