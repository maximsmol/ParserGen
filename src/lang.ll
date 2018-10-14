S -> Statements

Statements -> Statement | Statements'
Statements' -> & | StatementSep Statements
StatementSep -> '\n' | ';'

Statement -> E

E -> SurroundE

SurroundE ->
  InfixE |
  '(' E ')' |
  '[' E ']' |
  '{' E '}' |
  '\\' E '\\' |
  '`' E '`' |
  '"' E '"'

InfixE -> PostE InfixRHS
InfixRHS ->
  & |
  '+' E | '-' E | '*' E | '/' E |
  '~' E | '=' E |
  '>' MaybeEquals E | '<' MaybeEquals E |
  ' ' E | '.' E | ',' E |
  '^' MaybeCaret E | '_' MaybeUnderscore E |
  '|' MaybePipe E | '&' MaybeAmpersand E |
  ':' E
MaybeEquals -> & | '='
MaybeCaret -> & | '^'
MaybeUnderscore -> & | '_'
MaybePipe -> & | '|'
MaybeAmpersand -> & | '&'

PostE -> PreE PostERHS
PostERHS -> & | '\'' | '!' | '?'

PreE ->
  id |
  '-' PreE |
  '+' PreE |
  '~' PreE |
  '!' PreE |
  '$' PreE
