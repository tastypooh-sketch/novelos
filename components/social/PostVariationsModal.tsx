import React from 'react';
import { Modal } from '../manuscript/modals/Modal';
import type { EditorSettings, SocialPost } from '../../types';
import { SpinnerIcon } from '../common/Icons';

interface PostVariationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: EditorSettings;
    variations: SocialPost[] | null;
    platform: 'instagram' | 'tiktok' | null;
    onSelect: (post: SocialPost) => void;
    isLoading: boolean;
}

export const PostVariationsModal: React.FC<PostVariationsModalProps> = ({
    isOpen,
    onClose,
    settings,
    variations,
    platform,
    onSelect,
    isLoading,
}) => {
    if (!isOpen) return null;

    return (
        <Modal
            onClose={onClose}
            settings={settings}
            title={`Post Variations for ${platform === 'instagram' ? 'Instagram' : 'TikTok'}`}
            className="max-w-2xl"
        >
            <div className="space-y-4">
                {isLoading && !variations ? (
                    <div className="flex flex-col items-center justify-center text-center p-8">
                        <SpinnerIcon className="h-8 w-8 mb-4" />
                        <p className="font-semibold">Generating variations...</p>
                    </div>
                ) : variations && variations.length > 0 ? (
                    variations.map((post, index) => (
                        <div key={index} className="p-4 rounded-lg" style={{ backgroundColor: settings.toolbarButtonBg }}>
                            <p className="text-sm mb-2">{post.text}</p>
                            <p className="text-xs italic opacity-70 mb-3">{post.hashtags.join(' ')}</p>
                            <button
                                onClick={() => onSelect(post)}
                                className="px-3 py-1 text-xs font-semibold rounded-md text-white"
                                style={{ backgroundColor: settings.accentColor }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = settings.accentColorHover || ''}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = settings.accentColor || ''}
                            >
                                Use This Version
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="text-center opacity-70">Could not generate variations. Please try again.</p>
                )}
            </div>
        </Modal>
    );
};