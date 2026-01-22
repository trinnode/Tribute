;; SIP-010: Fungible Token Standard
;; https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md

(define-trait ft-trait
  (
    ;; Transfer from the sender to a new principal
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))

    ;; The human readable name of the token
    (get-name () (response (string-ascii 32) uint))

    ;; A short symbol for the token
    (get-symbol () (response (string-ascii 10) uint))

    ;; Number of decimals used to represent the token
    (get-decimals () (response uint uint))

    ;; Balance of the principal address
    (get-balance (principal) (response uint uint))

    ;; The current total supply of the token
    (get-total-supply () (response uint uint))

    ;; Optional URI for metadata about the token
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)
