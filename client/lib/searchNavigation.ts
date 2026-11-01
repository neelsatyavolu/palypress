type SearchBackNavigation = {
  canGoBack: () => boolean;
  goBack: () => void;
};

export function handleSearchBack(
  navigation: SearchBackNavigation,
  dismissKeyboard: () => void,
) {
  dismissKeyboard();

  if (navigation.canGoBack()) {
    navigation.goBack();
  }
}
