import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function SearchScreen() {
  const { theme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'product' | 'question'>('product');
  const styles = createStyles(theme);

  const handleSearch = () => {
    Keyboard.dismiss();
    // TODO: Implement search functionality
    console.log('Searching for:', searchQuery, 'Type:', searchType);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Search Type Selector */}
        <View style={styles.searchTypeContainer}>
          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'product' && { backgroundColor: theme.colors.primary },
              { borderColor: theme.colors.border }
            ]}
            onPress={() => setSearchType('product')}
          >
            <Ionicons 
              name="cube-outline" 
              size={20} 
              color={searchType === 'product' ? theme.colors.white : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.searchTypeText,
              { color: searchType === 'product' ? theme.colors.white : theme.colors.textSecondary }
            ]}>
              Product
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.searchTypeButton,
              searchType === 'question' && { backgroundColor: theme.colors.primary },
              { borderColor: theme.colors.border }
            ]}
            onPress={() => setSearchType('question')}
          >
            <Ionicons 
              name="help-circle-outline" 
              size={20} 
              color={searchType === 'question' ? theme.colors.white : theme.colors.textSecondary} 
            />
            <Text style={[
              styles.searchTypeText,
              { color: searchType === 'question' ? theme.colors.white : theme.colors.textSecondary }
            ]}>
              Question
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={[styles.searchContainer, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder={searchType === 'product' ? 'Search by model number...' : 'Ask a technical question...'}
            placeholderTextColor={theme.colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            multiline={searchType === 'question'}
            numberOfLines={searchType === 'question' ? 3 : 1}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Button */}
        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSearch}
          disabled={searchQuery.length === 0}
        >
          <Text style={styles.searchButtonText}>
            {searchType === 'product' ? 'Find Product' : 'Get Answer'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Quick Actions</Text>
          
          <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
              <Ionicons name="camera" size={24} color={theme.colors.secondary} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Scan Serial Plate</Text>
              <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
                Use your camera to identify the unit
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionCard, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white }]}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
              <Ionicons name="list" size={24} color={theme.colors.accent} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: theme.colors.text }]}>Browse OEMs</Text>
              <Text style={[styles.actionDescription, { color: theme.colors.textSecondary }]}>
                Explore manufacturers and models
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Popular Searches */}
        <View style={styles.popularSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Popular Searches</Text>
          <View style={styles.chipContainer}>
            {['Carrier HVAC', 'Trane Heat Pump', 'Lennox Furnace', 'Rheem Water Heater'].map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.chip, { backgroundColor: isDark ? theme.colors.backgroundSecondary : theme.colors.white, borderColor: theme.colors.border }]}
                onPress={() => setSearchQuery(item)}
              >
                <Text style={[styles.chipText, { color: theme.colors.text }]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
  },
  searchTypeContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  searchTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    gap: theme.spacing.xs,
  },
  searchTypeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: theme.spacing.xs,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  searchButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  popularSection: {
    marginBottom: theme.spacing.xl,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
