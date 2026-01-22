;; Tribute Smart Contract - Programmable Patronage on Stacks
;; Enables revenue splitting, yield generation, and on-chain reputation

;; Error codes
(define-constant ERR-UNAUTHORIZED (err u100))
(define-constant ERR-INVALID-AMOUNT (err u101))
(define-constant ERR-INVALID-SPLIT (err u102))
(define-constant ERR-TRANSFER-FAILED (err u103))

;; Data variables
(define-data-var contract-owner principal tx-sender)

;; Data maps
(define-map tributes
  { tribute-id: uint }
  {
    sender: principal,
    recipient: principal,
    amount: uint,
    timestamp: uint,
    has-splits: bool
  }
)

(define-map revenue-splits
  { tribute-id: uint }
  { 
    recipients: (list 10 principal),
    percentages: (list 10 uint)
  }
)

(define-map reputation
  { user: principal }
  {
    total-sent: uint,
    total-received: uint,
    transaction-count: uint,
    reputation-score: uint
  }
)

(define-map yield-positions
  { user: principal }
  {
    staked-amount: uint,
    yield-earned: uint,
    last-claim: uint
  }
)

;; Private functions

(define-private (update-reputation (user principal) (amount uint) (is-sender bool))
  (let
    (
      (current-rep (default-to
        { total-sent: u0, total-received: u0, transaction-count: u0, reputation-score: u0 }
        (map-get? reputation { user: user })
      ))
    )
    (if is-sender
      (map-set reputation { user: user }
        {
          total-sent: (+ (get total-sent current-rep) amount),
          total-received: (get total-received current-rep),
          transaction-count: (+ (get transaction-count current-rep) u1),
          reputation-score: (calculate-reputation-score
            (+ (get total-sent current-rep) amount)
            (get total-received current-rep)
            (+ (get transaction-count current-rep) u1)
          )
        }
      )
      (map-set reputation { user: user }
        {
          total-sent: (get total-sent current-rep),
          total-received: (+ (get total-received current-rep) amount),
          transaction-count: (+ (get transaction-count current-rep) u1),
          reputation-score: (calculate-reputation-score
            (get total-sent current-rep)
            (+ (get total-received current-rep) amount)
            (+ (get transaction-count current-rep) u1)
          )
        }
      )
    )
  )
)

(define-private (calculate-reputation-score (sent uint) (received uint) (count uint))
  ;; Simple reputation calculation: sqrt(received) + (sent * 0.5) + (count * 10)
  ;; Note: Clarity doesn't have sqrt, so we use a simplified version
  (+ (/ received u100) (/ sent u200) (* count u10))
)

;; Public functions

;; Send a simple tribute
(define-public (send-tribute (recipient principal) (amount uint))
  (begin
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (stx-transfer? amount tx-sender recipient))
    
    (let
      (
        (tribute-id (+ (var-get next-tribute-id) u1))
      )
      (map-set tributes { tribute-id: tribute-id }
        {
          sender: tx-sender,
          recipient: recipient,
          amount: amount,
          timestamp: block-height,
          has-splits: false
        }
      )
      (var-set next-tribute-id tribute-id)
      (update-reputation tx-sender amount true)
      (update-reputation recipient amount false)
      (ok tribute-id)
    )
  )
)

;; Send tribute with revenue splits
(define-public (send-tribute-with-splits 
  (recipient principal)
  (amount uint)
  (split-recipients (list 10 principal))
  (split-percentages (list 10 uint))
)
  (begin
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (is-eq (len split-recipients) (len split-percentages)) ERR-INVALID-SPLIT)
    
    ;; Validate percentages sum to 100
    (asserts! (is-eq (fold + split-percentages u0) u100) ERR-INVALID-SPLIT)
    
    (let
      (
        (tribute-id (+ (var-get next-tribute-id) u1))
      )
      ;; Store tribute info
      (map-set tributes { tribute-id: tribute-id }
        {
          sender: tx-sender,
          recipient: recipient,
          amount: amount,
          timestamp: block-height,
          has-splits: true
        }
      )
      
      ;; Store split configuration
      (map-set revenue-splits { tribute-id: tribute-id }
        {
          recipients: split-recipients,
          percentages: split-percentages
        }
      )
      
      ;; Execute splits
      (try! (execute-splits amount split-recipients split-percentages))
      
      (var-set next-tribute-id tribute-id)
      (update-reputation tx-sender amount true)
      (ok tribute-id)
    )
  )
)

(define-private (execute-splits 
  (total-amount uint)
  (recipients (list 10 principal))
  (percentages (list 10 uint))
)
  (ok true)
  ;; TODO: Implement actual split transfers
  ;; This would iterate through recipients and transfer proportional amounts
)

;; Stake for yield generation
(define-public (stake-for-yield (amount uint))
  (begin
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    (let
      (
        (current-position (default-to
          { staked-amount: u0, yield-earned: u0, last-claim: block-height }
          (map-get? yield-positions { user: tx-sender })
        ))
      )
      (map-set yield-positions { user: tx-sender }
        {
          staked-amount: (+ (get staked-amount current-position) amount),
          yield-earned: (get yield-earned current-position),
          last-claim: block-height
        }
      )
      (ok true)
    )
  )
)

;; Read-only functions

(define-read-only (get-reputation (user principal))
  (ok (map-get? reputation { user: user }))
)

(define-read-only (get-tribute (tribute-id uint))
  (ok (map-get? tributes { tribute-id: tribute-id }))
)

(define-read-only (get-yield-position (user principal))
  (ok (map-get? yield-positions { user: user }))
)

;; Counter for tribute IDs
(define-data-var next-tribute-id uint u0)
