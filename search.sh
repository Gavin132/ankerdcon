#!/bin/bash

# Define specific physical airport IATA codes
ORIGINS=("AMS" "BRU")
DESTINATIONS=("HND" "NRT" "KIX" "ITM")

for ORIGIN in "${ORIGINS[@]}"; do
  for DEST in "${DESTINATIONS[@]}"; do
    for OUTBOUND in 2026-11-07 2026-11-08 2026-11-09 2026-11-10; do
      for INBOUND in 2026-11-13 2026-11-14 2026-11-15 2026-11-16; do
        echo "====================================================="
        echo "Searching: $ORIGIN to $DEST | Out: $OUTBOUND, In: $INBOUND"
        echo "====================================================="
        
        # Execute the fli command with single explicit codes and 4h max layover
        fli flights $ORIGIN $DEST $OUTBOUND \
          --return $INBOUND \
          --max-layover 240 \
          --currency EUR \
          --sort CHEAPEST
        
        # Pause to prevent rate limiting from the API
        sleep 3
      done
    done
  done
done
