import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, TouchableWithoutFeedback, Keyboard, ScrollView, ActivityIndicator } from 'react-native'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { searchAll } from '../../lib/searchService';
import { Ionicons } from '@expo/vector-icons';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import ThemedSearchBar from '../../components/ThemedSearchBar';

const Discover = () => {
  const colorScheme = useColorScheme()
  const theme = Colors[colorScheme] ?? Colors.light
  const router = useRouter()

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ users: [], snippets: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Filter state
  const [viewFilter, setViewFilter] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState(null);

  const debounceTimerRef = useRef(null);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Hide results if query is empty
    if (!searchQuery || searchQuery.trim() === '') {
      setShowResults(false);
      setSearchResults({ users: [], snippets: [] });
      setIsSearching(false);
      return;
    }

    // Show loading state
    setIsSearching(true);
    setShowResults(true);

    // Set new debounce timer (350ms)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchAll(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults({ users: [], snippets: [] });
      } finally {
        setIsSearching(false);
      }
    }, 350);

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Navigate to user profile
  const handleUserPress = (userId) => {
    // Clear search and hide results
    setSearchQuery('');
    setShowResults(false);
    Keyboard.dismiss();
    
    // Navigate to profile
    router.push(`/profile?userId=${userId}`);
  };

  // Navigate to snippet owner's profile
  const handleSnippetPress = (snippet) => {
    // Clear search and hide results
    setSearchQuery('');
    setShowResults(false);
    Keyboard.dismiss();
    
    // Navigate to snippet owner's profile
    router.push(`/profile?userId=${snippet.ownerId}`);
  };

  // Handle search clear
  const handleClearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
    setSearchResults({ users: [], snippets: [] });
    setViewFilter('all');
    setSelectedGenre(null);
  };

  // Extract unique genres from search results
  const availableGenres = [...new Set(
    searchResults.snippets
      .map(snippet => snippet.genre)
      .filter(Boolean)
  )].sort();

  // Filter results based on view and genre filters
  const filteredUsers = viewFilter === 'snippets' ? [] : searchResults.users;
  
  const filteredSnippets = viewFilter === 'accounts' 
    ? [] 
    : selectedGenre
      ? searchResults.snippets.filter(snippet => snippet.genre === selectedGenre)
      : searchResults.snippets;

  // Check if we have any filtered results
  const hasFilteredResults = filteredUsers.length > 0 || filteredSnippets.length > 0;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <ThemedView style={styles.container} safe={true}>
        {/* Search Bar */}
        <ThemedSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search"
          onClear={handleClearSearch}
        />
        
        <Spacer />

        {/* Filters - only show when we have results */}
        {showResults && !isSearching && (searchResults.users.length > 0 || searchResults.snippets.length > 0) && (
          <View style={styles.filtersContainer}>
            {/* View Toggle Filters */}
            <View style={styles.viewToggle}>
              <Pressable
                style={[
                  styles.toggleButton,
                  viewFilter === 'all' && styles.toggleButtonActive,
                  { backgroundColor: viewFilter === 'all' ? theme.primary : theme.uiBackground }
                ]}
                onPress={() => setViewFilter('all')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  { color: viewFilter === 'all' ? '#FFFFFF' : theme.textSecondary }
                ]}>
                  All
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toggleButton,
                  viewFilter === 'accounts' && styles.toggleButtonActive,
                  { backgroundColor: viewFilter === 'accounts' ? theme.primary : theme.uiBackground }
                ]}
                onPress={() => setViewFilter('accounts')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  { color: viewFilter === 'accounts' ? '#FFFFFF' : theme.textSecondary }
                ]}>
                  Accounts
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toggleButton,
                  viewFilter === 'snippets' && styles.toggleButtonActive,
                  { backgroundColor: viewFilter === 'snippets' ? theme.primary : theme.uiBackground }
                ]}
                onPress={() => setViewFilter('snippets')}
              >
                <Text style={[
                  styles.toggleButtonText,
                  { color: viewFilter === 'snippets' ? '#FFFFFF' : theme.textSecondary }
                ]}>
                  Snippets
                </Text>
              </Pressable>
            </View>

            {/* Genre Chips - only show if we have snippets and view allows snippets */}
            {availableGenres.length > 0 && viewFilter !== 'accounts' && (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.genreScroll}
                contentContainerStyle={styles.genreScrollContent}
              >
                {/* All Genres Chip */}
                <Pressable
                  style={[
                    styles.genreChip,
                    selectedGenre === null && styles.genreChipActive,
                    { 
                      backgroundColor: selectedGenre === null ? theme.primary : theme.uiBackground,
                      borderColor: theme.primary
                    }
                  ]}
                  onPress={() => setSelectedGenre(null)}
                >
                  <Text style={[
                    styles.genreChipText,
                    { color: selectedGenre === null ? '#FFFFFF' : theme.textSecondary }
                  ]}>
                    All Genres
                  </Text>
                </Pressable>

                {/* Individual Genre Chips */}
                {availableGenres.map((genre) => (
                  <Pressable
                    key={genre}
                    style={[
                      styles.genreChip,
                      selectedGenre === genre && styles.genreChipActive,
                      { 
                        backgroundColor: selectedGenre === genre ? theme.primary : theme.uiBackground,
                        borderColor: theme.primary
                      }
                    ]}
                    onPress={() => setSelectedGenre(genre)}
                  >
                    <Text style={[
                      styles.genreChipText,
                      { color: selectedGenre === genre ? '#FFFFFF' : theme.textSecondary }
                    ]}>
                      {genre}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {showResults && !isSearching && (searchResults.users.length > 0 || searchResults.snippets.length > 0) && <Spacer />}

        {/* Search Results Overlay */}
        {showResults && (
          <View style={[styles.resultsContainer, { backgroundColor: theme.background }]}>
            <ScrollView 
              style={styles.resultsScroll}
              contentContainerStyle={styles.resultsContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Loading State */}
              {isSearching && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.textSecondary} />
                  <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    Searching...
                  </Text>
                </View>
              )}

              {/* No Results */}
              {!isSearching && !hasFilteredResults && (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                    No results found
                  </Text>
                  <Text style={[styles.noResultsSubtext, { color: theme.textSecondary }]}>
                    {selectedGenre ? 'Try a different genre or search term' : 'Try searching for different keywords'}
                  </Text>
                </View>
              )}

              {/* Results */}
              {!isSearching && hasFilteredResults && (
                <>
                  {/* Accounts Section */}
                  {filteredUsers.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                        Accounts
                      </Text>
                      {filteredUsers.map((user) => (
                        <Pressable
                          key={user.userId}
                          style={[styles.resultRow, { backgroundColor: theme.uiBackground }]}
                          onPress={() => handleUserPress(user.userId)}
                        >
                          <Image
                            source={
                              user.profileImage
                                ? { uri: user.profileImage }
                                : require('../../assets/icon.png')
                            }
                            style={styles.avatar}
                          />
                          <View style={styles.userInfo}>
                            <Text style={[styles.username, { color: theme.textPrimary }]}>
                              {user.username}
                            </Text>
                            {user.name && user.name !== user.username && (
                              <Text style={[styles.name, { color: theme.textSecondary }]}>
                                {user.name}
                              </Text>
                            )}
                          </View>
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={theme.textSecondary} 
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Snippets Section */}
                  {filteredSnippets.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
                        Snippets
                      </Text>
                      {filteredSnippets.map((snippet) => (
                        <Pressable
                          key={snippet.$id}
                          style={[styles.resultRow, { backgroundColor: theme.uiBackground }]}
                          onPress={() => handleSnippetPress(snippet)}
                        >
                          <View style={styles.snippetIcon}>
                            <Ionicons 
                              name="musical-note" 
                              size={24} 
                              color={theme.textSecondary} 
                            />
                          </View>
                          <View style={styles.snippetInfo}>
                            <Text 
                              style={[styles.snippetTitle, { color: theme.textPrimary }]}
                              numberOfLines={1}
                            >
                              {snippet.title}
                            </Text>
                            <Text style={[styles.snippetMeta, { color: theme.textSecondary }]}>
                              {snippet.genre} • {snippet.username}
                            </Text>
                          </View>
                          <Ionicons 
                            name="chevron-forward" 
                            size={20} 
                            color={theme.textSecondary} 
                          />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        )}

        {/* Existing Discover Content */}
        {!showResults && (
          <View style={styles.discoverContent}>
            <Text style={[styles.discoverText, { color: theme.textSecondary }]}>
              Discover Content Coming Soon
            </Text>
          </View>
        )}
      </ThemedView>
    </TouchableWithoutFeedback>
  )
}

export default Discover

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  filtersContainer: {
    width: '90%',
    gap: 12,
  },
  viewToggle: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 14,
  },
  genreScroll: {
    maxHeight: 40,
  },
  genreScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  genreChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genreChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  genreChipText: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 13,
  },
  resultsContainer: {
    width: '90%',
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  loadingText: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noResultsText: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
  noResultsSubtext: {
    fontFamily: 'inter',
    fontWeight: '400',
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontFamily: 'inter',
    fontWeight: '700',
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
  name: {
    fontFamily: 'inter',
    fontWeight: '400',
    fontSize: 14,
  },
  snippetIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  snippetInfo: {
    flex: 1,
    gap: 4,
  },
  snippetTitle: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
  snippetMeta: {
    fontFamily: 'inter',
    fontWeight: '400',
    fontSize: 14,
  },
  discoverContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discoverText: {
    fontFamily: 'inter',
    fontWeight: '600',
    fontSize: 16,
  },
})