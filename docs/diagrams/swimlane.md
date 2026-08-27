# Week 3 — Swimlane

```mermaid
flowchart LR

    subgraph U["USER"]
        direction TB
        U1["Uploads required WhatsApp screenshot"]
        U2["Reviews and corrects extracted claims"]
        U3["Optionally uploads one fiscal document"]
        U4["Reviews and corrects fiscal fields"]
        U5["Optionally enters bank information or uploads one screenshot"]
        U6["Reviews and corrects bank fields"]
        U7["Reads comparisons, sources, limits, and next-step options"]
        U8["States what they would do next"]
        U9["Makes payment decision outside the prototype"]
    end

    subgraph P["PROTOTYPE"]
        direction TB
        P1["Validates the WhatsApp upload"]
        P2["Displays extracted claims as editable fields"]
        P3["Accepts up to one optional fiscal document"]
        P4["Displays fiscal fields as extracted, not SAT-verified"]
        P5["Accepts one bank source by manual entry or screenshot"]
        P6["Displays entered or extracted bank fields without claiming account-owner verification"]
        P7["Compares only supported corresponding fields"]
        P8["Keeps missing evidence separate from conflicting evidence"]
        P9["Classifies and explains bounded evidence relationships"]
    end

    subgraph V["VISION API"]
        direction TB
        V1["Extracts available WhatsApp claims"]
        V2["Extracts name and RFC from fiscal document"]
        V3["Extracts available information from banking-app screenshot"]
    end

    U1 --> P1
    P1 --> V1
    V1 --> P2
    P2 --> U2

    U2 --> U3
    U3 -->|If provided| P3
    P3 --> V2
    V2 --> P4
    P4 --> U4

    U2 -->|If no fiscal document| U5
    U4 --> U5

    U5 -->|Manual entry| P5
    U5 -->|Screenshot| P5
    P5 -->|Screenshot only| V3
    V3 --> P6
    P5 -->|Manual entry| P6
    P6 --> U6

    U5 -->|If no bank information| P7
    U6 --> P7

    P7 --> P8
    P8 --> P9
    P9 --> U7
    U7 --> U8
    U8 --> U9
