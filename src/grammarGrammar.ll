      S -> Rules
  Rules -> & | Rule Rules'
 Rules' -> & | '\n' Rules
   Rule -> id|| '->' Subs
   Subs -> Sub Subs'
  Subs' -> & | Subs | '|' Subs
    Sub -> id | Str
    Str -> '\'' StrChar
StrChar -> '\'' | '\\' &any StrChar | &any StrChar
