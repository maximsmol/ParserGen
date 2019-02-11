S -> E
E -> Lam | AppOrLookup
Lam -> '\\' id '->' E
AppOrLookup -> '(' E ')' '$' E | id '$' E
