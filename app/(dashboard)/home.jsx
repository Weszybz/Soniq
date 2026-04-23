import { StyleSheet, Text, View, useColorScheme, Pressable, Image, TextInput, TouchableWithoutFeedback, Keyboard, ActivityIndicator, ScrollView, RefreshControl} from 'react-native'
import { React, useMemo, useState, useRef, useEffect } from 'react'
import { Colors } from '../../constants/Colors';
import { useRouter } from 'expo-router';
import { useProfile } from '../../contexts/ProfileContext';
import { useUser } from '../../hooks/useUser';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useBottomSheet } from '../../contexts/BottomSheetContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { listSnippets, toggleSnippetLike, updateSnippetCommentCount, incrementSnippetShare } from '../../lib/snippets';
import { listCommentsBySnippet } from '../../lib/comments';
import { searchAll } from '../../lib/searchService';
import { Audio } from 'expo-av';
import { useSharedValue } from 'react-native-reanimated';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';

// themed components
import ThemedView from '../../components/ThemedView';
import ThemedText from '../../components/ThemedText';
import Spacer from '../../components/Spacer';
import ThemedButton from '../../components/ThemedButton';
import ThemedTextInput from '../../components/ThemedTextInput';
import ThemedBottomSheet from '../../components/ThemedBottomSheet';
import ThemedWaveform from '../../components/ThemedWaveform';
import ThemedComments from '../../components/ThemedComments';
import ThemedOptions from '../../components/ThemedOptions';
import ThemedSnippet from '../../components/ThemedSnippets';
import ThemedSearchBar from '../../components/ThemedSearchBar';
import ThemedShare from '../../components/ThemedShare';



const profileIcon = require('../../assets/icon.png');

const Home = () => {
	const colorScheme = useColorScheme()
	const theme = Colors[colorScheme] ?? Colors.light

	const router = useRouter()

	const { profileImage, setProfileImage } = useProfile();
	const { user } = useUser()
	const { notifCount } = useNotifications()

	const handleSubmit = () => {
		router.push('/home')
	}

	// 📸 Open system image picker
	const pickImage = async () => {
		const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (!permissionResult.granted) {
			alert('Permission to access gallery is required!');
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			aspect: [1, 1],
			quality: 0.9,
		});

		if (!result.canceled) {
			setProfileImage(result.assets[0].uri); // saves globally
		}
	};

	const { bottomSheetRef, setContent, expandLarge } = useBottomSheet();

	
	const handleCardOptions = (snippet) => {
		setContent(
			<ThemedOptions
				key={`options-${snippet.$id}-${Date.now()}`}
				snippet={snippet}
				theme={theme}
				user={user}
				onClose={() => bottomSheetRef.current?.close()}
				onShare={handleShareSnippet}
			/>
		);
		bottomSheetRef.current?.expand();
	}; 

	const handleShareSnippet = (snippet) => {
		setContent(
			<ThemedShare
				key={`share-${snippet.$id}-${Date.now()}`}
				snippet={snippet}
				currentUser={user}
				theme={theme}
				onClose={() => bottomSheetRef.current?.close()}
			/>
		);
		expandLarge();
	};


	const handleCardOptionsClose = () => bottomSheetRef.current?.close()

	const soundRef = useRef(null);

	const [searchQuery, setSearchQuery] = useState('');
	const [searchResults, setSearchResults] = useState({ users: [], snippets: [] });
	const [isSearching, setIsSearching] = useState(false);
	const [showResults, setShowResults] = useState(false);
	const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'accounts' | 'snippets'
	const [selectedGenre, setSelectedGenre] = useState(null); // null for all genres
	const debounceTimerRef = useRef(null);

	const [snippets, setSnippets] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [refreshing, setRefreshing] = useState(false);

	const [likedSnippets, setLikedSnippets] = useState(new Set());
	const [visibleComments, setVisibleComments] = useState(new Set())
	const [commentsBySnippetId, setCommentsBySnippetId] = useState({});
	const [commentsLoading, setCommentsLoading] = useState({});

	const [activeSnippetId, setActiveSnippetId] = useState(null);
	const [durationsById, setDurationsById] = useState({});
	const [positionsById, setPositionsById] = useState({});
	
	useEffect(() => {
		const fetchSnippets = async () => {
			try {
				setLoading(true);
				setError(null);
				const data = await listSnippets();
				setSnippets(data);

				// Initialise liked snippets based on current user
				if (user?.$id) {
					const userLikedSnippets = new Set(
						data
							.filter(snippet => snippet.likedBy?.includes(user.$id))
							.map(snippet => snippet.$id)
					);
					setLikedSnippets(userLikedSnippets)
				}
				await preloadSnippetMetadata(data);
			} catch (err) {
				console.error('Failed to fetch snippets:', err);
				setError(err?.message || 'Failed to load snippets');
			} finally {
				setLoading(false);
			}
		};
		fetchSnippets();
	}, [user?.$id])

	// Debounced search effect (same behavior as discover page)
	useEffect(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		if (!searchQuery || searchQuery.trim() === '') {
			setShowResults(false);
			setSearchResults({ users: [], snippets: [] });
			setIsSearching(false);
			return;
		}

		setIsSearching(true);
		setShowResults(true);

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

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [searchQuery]);

	const handleUserPress = (userId) => {
		setSearchQuery('');
		setShowResults(false);
		Keyboard.dismiss();
		router.push(`/profile?userId=${userId}`);
	};

	const handleSnippetPress = (snippet) => {
		setSearchQuery('');
		setShowResults(false);
		Keyboard.dismiss();
		router.push(`/profile?userId=${snippet.ownerId}`);
	};

	const handleClearSearch = () => {
		setSearchQuery('');
		setShowResults(false);
		setSearchResults({ users: [], snippets: [] });
		setViewFilter('all');
		setSelectedGenre(null);
	};

	const availableGenres = [...new Set(
		searchResults.snippets
			.map(snippet => snippet.genre)
			.filter(Boolean)
	)].sort();

	const filteredUsers = viewFilter === 'snippets' ? [] : searchResults.users;

	const filteredSnippets = viewFilter === 'accounts'
		? []
		: selectedGenre
			? searchResults.snippets.filter(snippet => snippet.genre === selectedGenre)
			: searchResults.snippets;

	const hasFilteredResults = filteredUsers.length > 0 || filteredSnippets.length > 0;

	// Handle pull-to-refresh
	const handleRefresh = async () => {
		setRefreshing(true);
		try {
			setError(null);
			const data = await listSnippets();
			setSnippets(data);
			
			// Update liked snippets based on current user
			if (user?.$id) {
				const userLikedSnippets = new Set(
					data
						.filter(snippet => snippet.likedBy?.includes(user.$id))
						.map(snippet => snippet.$id)
				);
				setLikedSnippets(userLikedSnippets);
			}
			
			// Preload metadata for new snippets
			await preloadSnippetMetadata(data);
		} catch (err) {
			console.error('Failed to refresh snippets:', err);
			setError(err?.message || 'Failed to refresh snippets');
		} finally {
			setRefreshing(false);
		}
	};

	const preloadSnippetMetadata = async (snippetsList) =>  {
		const loadPromises = snippetsList.map(async (snippet) => {
			if (!snippet.fileUrl || durationsById[snippet.$id]) return;
			try {
				const { sound } = await Audio.Sound.createAsync(
					{ uri: snippet.fileUrl },
					{ shouldPlay: false },
					null
				);

				const status = await sound.getStatusAsync();
				if (status.isLoaded && status.durationMillis) {
					setDurationsById(prev => ({
						...prev,
						[snippet.$id]: status.durationMillis
					}));
				}
				await sound.unloadAsync();
			} catch (err) {
				console.warn(`Failed to preload metadate for snippet ${snippet.$id}:`, err);
			}
		});
		await Promise.allSettled(loadPromises);
	};

	const handleToggleLike = async (snippetId) => {
		const snippet = snippets.find(s => s.$id === snippetId);
		if (!snippet) return;

		const isCurrentlyLiked = likedSnippets.has(snippetId)
		const currentCount = snippet.likes || 0;
		const currentLikedBy = snippet.likedBy || [];

		setLikedSnippets(prev => {
			const newSet = new Set(prev);
			if (isCurrentlyLiked) {
				newSet.delete(snippetId)
			} else {
				newSet.add(snippetId)
			}
			return newSet
		});

		const filteredLikedBy = isCurrentlyLiked
			? currentLikedBy.filter(id => id !== user.$id)
			: [...currentLikedBy, user.$id]

		setSnippets(prev => prev.map(s =>
			s.$id === snippetId
				? { ...s,
					likes: isCurrentlyLiked ? Math.max(0, currentCount - 1) : currentCount + 1,
					likedBy: filteredLikedBy
				}
				: s
		));

		try {
			await toggleSnippetLike(snippetId, isCurrentlyLiked, currentCount, user.$id, currentLikedBy, { ownerId: snippet.ownerId, title: snippet.title });
		} catch (err) {
			console.error('Failed to update like', err);

			// Rollback on error
			setLikedSnippets(prev => {
				const newSet = new Set(prev);
				if (isCurrentlyLiked) {
					newSet.add(snippetId)
				} else {
					newSet.delete(snippetId)
				}
				return newSet
			});

			setSnippets(prev => prev.map(s =>
			s.$id === snippetId
				? { ...s,
					likes: currentCount,
					likedBy: currentLikedBy,
				}
				: s
			));

			alert('Failed to update like. Please try again.')
		}
	};

	const handleToggleComments = async (snippetId) => {
		const isCurrentlyVisible = visibleComments.has(snippetId);
		setVisibleComments(prev => {
			const newSet = new Set(prev);
			if (isCurrentlyVisible) {
				newSet.delete(snippetId)
			} else {
				newSet.add(snippetId)
			}
			return newSet
		});

		if (!isCurrentlyVisible && !commentsBySnippetId[snippetId]) {
			setCommentsLoading(prev => ({ ...prev, [snippetId]: true }));

			try {
				const commentsFromDb = await listCommentsBySnippet(snippetId);

				const mappedComments = commentsFromDb.map(comment => ({
					id: comment.$id,
					username: comment.username,
					avatarUrl: comment.profileImage || null,
					text: comment.content,
					time: comment.timestamp || 0,
					likes: comment.likes || 0,
					likedByCurrentUser: comment.likedBy?.includes(user.$id) || false,
					replyTo: comment.parentCommentId || null,
					createdAt: comment.$createdAt,
				}));

				setCommentsBySnippetId(prev => ({
					...prev,
					[snippetId]: mappedComments
				}));
			} catch (error) {
				console.error("Failed to fetch comments:", err);

				setCommentsBySnippetId(prev => ({
					...prev,
					[snippetId]: []
				}));
			} finally {
				setCommentsLoading(prev => ({ ...prev, [snippetId]: false }))
			}
		}
	};

	const handleCommentCountChange = async (snippetId, newCount) => {
		setSnippets(prev => prev.map(s =>
			s.$id === snippetId
				? { ...s, commentsCount: newCount }
				: s
		));

		try {
			await updateSnippetCommentCount(snippetId, newCount);
		} catch (err) {
			console.error ('Failed to update comment count', err)

			// Rollback error - refetch tghe snippet to get accurate count
			const snippet = snippet.find(s => s.$id === snippetId)
			if (snippet) {
				setSnippets(prev => prev.map(s =>
				s.$id === snippetId
					? { ...s, commentCount: snippet.commentCount || 0 }
					: s
				));
			}
		}
	}

	const handleIncrementCommentCount = (snippetId) => {
		setSnippets(prev => prev.map(s =>
			s.$id === snippetId
				? { ...s, commentsCount: (s.commentsCount || 0) + 1}
				: s
		));
	};

	const handleShare = async (snippetId) => {
		const snippet = snippets.find(s => s.$id === snippetId);
		if (!snippet) return

		const currentCount = snippet.shares || 0;

		setSnippets(prev => prev.map(s =>
			s.$id === snippetId
				? { ...s, shares: currentCount + 1 }
				: s
		));

		try {
			await incrementSnippetShare(snippetId, currentCount)

			alert ('Share link copied!')
		} catch (err) {
			console.error('Failed to update share count:', err)

			setSnippets(prev => prev.map(s =>
				s.$id === snippetId
					? { ...s, shares: currentCount }
					: s
			));
			alert('Failed to share. Please try again.')
		};
	};

	const handlePlay = async (snippet) => {
		const snippetId = snippet.$id;

		if (activeSnippetId === snippetId && soundRef.current) {
			try {
				const status = await soundRef.current.getStatusAsync();
				if (status.isLoaded) {
					if (status.isPlaying) {
						await soundRef.current.pauseAsync();
					} else {
						await soundRef.current.playAsync();
					}
					return;
				}
			} catch (err) {
				console.error("Error toggling playback:", err);
			}
		}

		try {
			if (soundRef.current) {
				try {
					await soundRef.current.stopAsync();
					await soundRef.current.unloadAsync();
				} catch (err) {
					console.warn("Error stopping previos audio:", err)
				}
				soundRef.current = null;
			}
			setActiveSnippetId(snippetId);
		} catch (err) {
			console.error("Error switching audio:", err);
			alert("Faailed to play audio. Please try again.");
		}
	};

	const handlePositionChange = (snippetId, positionMillis) => {
		setPositionsById(prev => ({
			...prev,
			[snippetId]: positionMillis
		}));
	};

	const handleDurationChange = (snippetId, durationMillis) => {
		setDurationsById(prev => ({
			...prev,
			[snippetId]: durationMillis
		}));
	};

	const getTimeBasedGreeting = () => {
		const hour = new Date().getHours();
		if (hour < 12) return 'Good Morning';
		if (hour < 18) return 'Good Afternoon';
		return 'Good Evening';
	};

	return (
		<TouchableWithoutFeedback onPress={Keyboard.dismiss}>
			<ThemedView style = {styles.container} safe = {true}>
				<View style={styles.top}>
					<Text style={{ fontSize: 20, fontWeight: '600' , fontFamily: 'inter', color: theme.textPrimary }}>
            {getTimeBasedGreeting()}, {user?.prefs?.firstName}
          </Text>
					<View style={[styles.topRight, {
						// paddingVertical: 2,
						// marginRight: 24,
					}]}>
						<Pressable onPress={() => router.push('/notifications')} style={{ position: 'relative' }}>
							<Ionicons name="notifications-outline" size={40} color={theme.textSecondary} style={{ marginRight: 0 }} />
								{notifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>
                      {notifCount > 99 ? '99+' : notifCount}
                    </Text>
                  </View>
                )}
						</Pressable>
						<Pressable onPress={() => router.push('/profile')}>
							<Image
								source={
									profileImage
									? { uri: profileImage }
									: require('../../assets/icon.png') // fallback / default
								}
								style={{
									width: 40,
									height: 40,
									borderRadius: 20,
									alignSelf: 'flex-end'
								}}
							/>
						</Pressable>
					</View>
				</View>
				<Spacer />
				<ThemedSearchBar
					value={searchQuery}
					onChangeText={setSearchQuery}
					placeholder="Search"
					onClear={handleClearSearch}
				/>
				<Spacer />

				
				{showResults && !isSearching && (searchResults.users.length > 0 || searchResults.snippets.length > 0) && (
					<View style={styles.filtersContainer}>
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

						{availableGenres.length > 0 && viewFilter !== 'accounts' && (
							<ScrollView
								horizontal
								showsHorizontalScrollIndicator={false}
								style={styles.genreScroll}
								contentContainerStyle={styles.genreScrollContent}
							>
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
							{isSearching && (
								<View style={styles.loadingContainer}>
									<ActivityIndicator size="large" color={theme.textSecondary} />
									<Text style={[styles.loadingText, { color: theme.textSecondary }]}>
										Searching...
									</Text>
								</View>
							)}

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

							{!isSearching && hasFilteredResults && (
								<>
									{filteredUsers.length > 0 && (
										<View style={styles.section}>
											<Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
												Accounts
											</Text>
											{filteredUsers.map((foundUser) => (
												<Pressable
													key={foundUser.userId}
													style={[styles.resultRow, { backgroundColor: theme.uiBackground }]}
													onPress={() => handleUserPress(foundUser.userId)}
												>
													<Image
														source={
															foundUser.profileImage
																? { uri: foundUser.profileImage }
																: require('../../assets/icon.png')
														}
														style={styles.avatar}
													/>
													<View style={styles.userInfo}>
														<Text style={[styles.username, { color: theme.textPrimary }]}>
															{foundUser.username}
														</Text>
														{foundUser.name && foundUser.name !== foundUser.username && (
															<Text style={[styles.name, { color: theme.textSecondary }]}>
																{foundUser.name}
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
															{snippet.collaboratorUsername ? ` ft. @${snippet.collaboratorUsername}` : ''}
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

				{/* Scrollable feed */}
				{!showResults && (
					<ScrollView
						style={styles.scrollView}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					refreshControl={
							<RefreshControl
									refreshing={refreshing}
									onRefresh={handleRefresh}
									tintColor={theme.textSecondary}
									colors={[theme.textSecondary]}
							/>
						}
				>
					{loading && !refreshing && snippets.length === 0 && (
						<View style={[styles.feedState, { width: '100%' }]}>
							<ActivityIndicator size="large" color={theme.textSecondary} />
							<Text style={[styles.feedStateText, { color: theme.textSecondary }]}>Loading snippets...</Text>
						</View>
					)}

					{error && (
						<View style={[styles.feedState, { width: '100%' }]}>
							<Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
							<Text style={[styles.feedStateText, { color: "#ef4444" }]}>{error}</Text>
						</View>
					)}

					{!loading && !error && snippets.length === 0 && (
						<View style={[styles.feedState, {width: '100%'}]}>
							<Ionicons name="musical-note-outline" size={48} color={theme.textSecondary} />
							<Text style={[styles.feedStateText, { color: theme.textSecondary }]}>No snippets yet</Text>
							<Text style={[styles.feedStateSubtext, { color: theme.textSecondary }]}>Upload your first snippet to get started</Text>
						</View>
					)}

					{!loading && !error && snippets.map((snippet) => (
						<ThemedSnippet
							key={snippet.$id}
							snippet={snippet}
							currentUser={user}
							theme={theme}
							soundRef={soundRef}
							activeSnippetId={activeSnippetId}
							onSnippetActivate={(id) => setActiveSnippetId(id)}
							onSnippetUpdate={(updatedSnippet) => {
								setSnippets(prev => prev.map(s =>
									s.$id === updatedSnippet.$id ? updatedSnippet : s
								));
							}}
							onOptions={handleCardOptions}
							style={{ width: '90%' }}
						/>
					))}
				</ScrollView>
				)}
			</ThemedView>
		</TouchableWithoutFeedback>
	)
}

export default Home

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		// justifyContent: 'center',
	},
	title: {
		fontFamily: 'inter',
		fontWeight: '600',
		fontSize: 20,
		// paddingTop: '35%'
	},
	buttonText: {
		fontFamily: 'inter',
		fontStyle: 'normal',
		fontWeight: 'bold',
		fontSize: 20
	},
	textSecondary: {
		fontFamily: 'inter',
		fontStyle: 'normal',
		fontWeight: '600',
		fontSize: 14,
		width: '75%',
		textAlign: 'center'
	},
	search: {
	  flexDirection: 'row',
	  alignItems: 'center',
	},
	top: {
		flexDirection: 'row',
		width: '90%',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	topRight: {
		flexDirection: 'row',
		alignSelf: 'flex-end',
		gap: 8,
		alignItems: 'center'
		// justifyContent: 'center',
	},
	card: {
		// flexDirection: 'row',
		borderRadius: 10,
		width: '90%',
		// height: '25%',
		padding: 16,
		gap: 16,
		// justifyContent: 'space-between',
		// alignItems: 'center',
	},
	cardTop: {
		flexDirection: 'row',
		width: '100%',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	cardTopRight: {
		alignSelf: 'center',
	},
	profileUsernameGenre: {
		flexDirection: 'row',
		gap: 14,
	},
	userGenre: {

	},
	userGenreTitle: {
		fontFamily: 'inter',
		fontWeight: '600',
		fontSize: 16
	},
	userGenreText: {
		fontFamily: 'inter',
		fontWeight: '500',
		fontSize: 14
	},
	waveform: {

	},
	reactions: {
		flexDirection: 'row',
		gap: 16,
		alignItems: 'flex-end',        
	},
	reactionsItem: {
		flexDirection: 'row',
		gap: 4,
		alignItems: 'baseline'
	},
	likes: {
		flexDirection: 'row',
		gap: 4,
		alignItems: 'baseline'
	},
	numbers: {
		fontFamily: 'inter',
		fontWeight: '500',
		fontSize: 18
	},
	feedState: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 64,
		gap: 12,
	},
	feedStateText: {
		fontFamily: 'inter',
		fontWeight: '600',
		fontSize: 16,
		textAlign: 'center',
	},
	feedStateSubtext: {
		fontFamily: 'inter',
		fontWeight: '400',
		fontSize: 14,
		textAlign: 'center',
	},
	ScrollView: {
		flex: 1,
		width: '100%',
	},
	scrollContent: {
		alignItems: 'center',
		paddingBottom: 96,
	},
	notifBadge: {
		position: 'absolute',
		top: 0,
		right: 0,
		minWidth: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: '#ef4444',
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 3,
	},
	notifBadgeText: {
		color: '#fff',
		fontSize: 10,
		fontWeight: '700',
		fontFamily: 'inter',
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

})