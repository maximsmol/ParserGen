S -> Rules
Rules -> Rules' | Rule Rules'
Rules' -> & | space Rules
Rules -> id '->' AllowNL Subs
Subs -> Sub Subs'
Subs' -> & | Subs | '|' AllowNL Subs
Sub -> id | token | Str
Str -> '\'' StrPart
StrPart -> '\'' | '\\' Any StrPart | StrChar StrPart
StrChar -> strchar | id | token | space | '-' | '>' | '|'
Any -> StrChar | '\'' | '\\'
AllowNL -> space | &
