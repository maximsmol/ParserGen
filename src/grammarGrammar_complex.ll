S -> Rules
Rules -> Rule Rules'
Rules' -> & | '\n' Rules
Rule -> Id MaybeSpaces '->' MaybeSpaces Subs
Subs -> Sub Subs'
Subs' -> & | Space Subs'Space | '|' MaybeSpaces Subs
Subs'Space -> Subs | MaybeSpaces '|' Subs
Sub -> Id | SpecialId | Str
Str -> '\'' StrChar
StrChar -> '\'' | '\\' &any StrChar | &any StrChar
Id -> IdCharFirst Id'
Id' -> IdChar Id' | &
IdChar -> IdCharFirst | '\''
IdCharFirst -> IdCharL | IdCharU
IdCharL -> 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
IdCharU -> 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
MaybeSpaces -> Spaces | &
SpacePlus -> Space MaybeSpaces
Space -> ' '
Spaces -> Space Spaces'
Spaces' -> Space Spaces | &
SpecialId -> '&' Id'
