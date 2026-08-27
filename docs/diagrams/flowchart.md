# Week 3 — Flowchart

```mermaid
flowchart TD
    A["User receives supplier payment instructions through WhatsApp"] --> B["Upload required WhatsApp screenshot"]
    B --> C["Vision API extracts available claims"]
    C --> D["User reviews and corrects extracted fields"]
    D --> E{"Add one fiscal document?"}

    E -->|Yes| F["Upload fiscal document"]
    F --> G["Vision API extracts name and RFC"]
    G --> H["User reviews and corrects fiscal fields"]
    H --> I{"Add bank information?"}
    E -->|No| I

    I -->|No| O["Compare supported fields across available sources"]
    I -->|Yes| J{"How will the user provide it?"}
    J -->|Manual entry| K["Enter bank-displayed information"]
    K --> O
    J -->|Screenshot| L["Upload one banking-app screenshot"]
    L --> M["Vision API extracts available bank information"]
    M --> N["User reviews and corrects bank fields"]
    N --> O

    O --> P["Classify supported relationships: Coincide, No coincide, or No verificado"]
    P --> Q["Keep missing evidence separate from conflicting evidence"]
    Q --> R["Show sources, limits, and neutral next-step options"]
    R --> T["Ask user what they would do next"]
    T --> S["User makes the payment decision outside the prototype"]
