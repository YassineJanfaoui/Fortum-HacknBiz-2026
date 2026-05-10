package aml

import rego.v1

# EU Travel Rule: information required at 1000 EUR
deny contains reason if {
    input.amount_eur >= 1000
    input.amount_eur < 10000
    reason := sprintf("Travel Rule: transfer info required for amount EUR %v", [input.amount_eur])
}

# AML 6th Directive SAR threshold (EU)
deny contains reason if {
    input.amount_eur >= 10000
    reason := sprintf("AML threshold: SAR required for amount EUR %v", [input.amount_eur])
}

# Structuring
deny contains reason if {
    input.structuring_score > 0.7
    reason := sprintf("Structuring pattern detected (score=%v)", [input.structuring_score])
}

# Sanctions match (Chainalysis or our Merkle tree)
deny contains reason if {
    input.sanctions_match == true
    reason := "Wallet matches sanctions list"
}

# Taint
deny contains reason if {
    input.taint_score > 0.3
    reason := sprintf("Taint score %v exceeds 0.3 threshold", [input.taint_score])
}

# Sanctioned jurisdictions (EU + US overlap)
deny contains reason if {
    sanctioned := {"IR", "KP", "SY", "CU", "RU"}
    sanctioned[input.jurisdiction]
    reason := sprintf("Sanctioned jurisdiction: %v", [input.jurisdiction])
}

allow if {
    count(deny) == 0
}

requires_sar if {
    input.amount_eur >= 10000
}
requires_sar if {
    input.sanctions_match == true
}
