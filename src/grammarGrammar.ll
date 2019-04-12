      S -> Rules
  Rules -> & | Spaces? Rule Rules'
 Rules' -> & | '\n' Rules
   Rule -> id Spaces? '->' Spaces? Subs
   Subs -> Sub Subs'
  Subs' -> & | Subs | Spaces? '|' Spaces? Subs
    Sub -> id | Str
    Str -> '\'' StrChar
StrChar -> '\'' | '\\' &any StrChar | &any StrChar
Spaces? -> & | Spaces
Spaces -> space Spaces
