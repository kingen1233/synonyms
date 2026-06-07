import { useState } from 'react';
import { Box, Card, CardContent, Tab, Tabs } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import { SearchSynonyms } from '../dictionary/SearchSynonyms';
import { BrowseSynonyms } from '../dictionary/BrowseSynonyms';

type View = 'search' | 'browse';

export function DictionaryPanel() {
    const [view, setView] = useState<View>('search');

    return (
        <Card>
            {/* Toggle lives inside the card header, flush with the card border */}
            <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}>
                <Tabs
                    value={view}
                    onChange={(_, newView: View) => setView(newView)}
                    aria-label="Dictionary view"
                    textColor="primary"
                    indicatorColor="primary"
                    variant="fullWidth"
                >
                    <Tab
                        value="search"
                        label="Search"
                        icon={<SearchIcon fontSize="small" />}
                        iconPosition="start"
                        sx={{ minHeight: 48, textTransform: 'none', fontWeight: 500 }}
                    />
                    <Tab
                        value="browse"
                        label="Browse"
                        icon={<FormatListBulletedIcon fontSize="small" />}
                        iconPosition="start"
                        sx={{ minHeight: 48, textTransform: 'none', fontWeight: 500 }}
                    />
                </Tabs>
            </Box>

            <CardContent sx={{ p: 3 }}>
                {view === 'search' ? <SearchSynonyms /> : <BrowseSynonyms />}
            </CardContent>
        </Card>
    );
}
