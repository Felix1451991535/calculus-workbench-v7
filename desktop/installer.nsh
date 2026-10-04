!macro customInstall
  ; Preserve the sibling workspace on reinstall and uninstall.
  CreateDirectory "$INSTDIR\workspace"
!macroend
!macro customRemoveFiles
  ; NSIS default removes the whole installation directory, including user workspace.
  ; Remove only application files; leave workspace and its backups intact.
  SetOutPath $TEMP
  Delete "$INSTDIR\*.exe"
  Delete "$INSTDIR\*.dll"
  Delete "$INSTDIR\*.pak"
  Delete "$INSTDIR\*.dat"
  Delete "$INSTDIR\*.bin"
  Delete "$INSTDIR\*.txt"
  Delete "$INSTDIR\*.html"
  Delete "$INSTDIR\*.blockmap"
  RMDir /r "$INSTDIR\resources"
  RMDir /r "$INSTDIR\locales"
!macroend
