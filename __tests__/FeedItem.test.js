import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import FeedItem from "../src/components/feed/FeedItem";

// Mock the usePhotoReactions hook
jest.mock("../src/hooks/usePhotoReactions", () => ({
  usePhotoReactions: jest.fn(() => ({
    groupedReactions: [],
    addReaction: jest.fn(),
  })),
}));

describe("FeedItem", () => {
  const mockOnPhotoPress = jest.fn();
  const mockOnEventPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("event_created type", () => {
    it("should render event creation feed item", () => {
      const item = {
        id: "feed-1",
        type: "event_created",
        actor_name: "John Doe",
        entity_name: "Pizza Night",
        created_at: new Date().toISOString(),
      };

      const { getByText } = render(
        <FeedItem item={item} onEventPress={mockOnEventPress} />,
      );

      expect(getByText("John Doe")).toBeTruthy();
      expect(getByText(" created a new event ")).toBeTruthy();
      expect(getByText("Pizza Night")).toBeTruthy();
    });

    it("should call onEventPress when tapped", () => {
      const item = {
        id: "feed-1",
        type: "event_created",
        entity_id: "event-123",
        actor_name: "John Doe",
        entity_name: "Pizza Night",
        created_at: new Date().toISOString(),
      };

      const { getByText } = render(
        <FeedItem item={item} onEventPress={mockOnEventPress} />,
      );

      fireEvent.press(getByText("John Doe"));
      expect(mockOnEventPress).toHaveBeenCalledWith("event-123");
    });
  });

  describe("voting_decided type", () => {
    it("should render voting result feed item with winner", () => {
      const item = {
        id: "feed-2",
        type: "voting_decided",
        entity_name: "Movie Night",
        winning_option: "Marvel Movie",
        created_at: new Date().toISOString(),
      };

      const { getByText } = render(
        <FeedItem item={item} onEventPress={mockOnEventPress} />,
      );

      expect(getByText("Voting ended for ")).toBeTruthy();
      expect(getByText("Movie Night")).toBeTruthy();
      expect(getByText("Winner: Marvel Movie")).toBeTruthy();
    });

    it("should render voting result without winner", () => {
      const item = {
        id: "feed-2",
        type: "voting_decided",
        entity_name: "Movie Night",
        created_at: new Date().toISOString(),
      };

      const { getByText, queryByText } = render(
        <FeedItem item={item} onEventPress={mockOnEventPress} />,
      );

      expect(getByText("Voting ended for ")).toBeTruthy();
      expect(queryByText(/Winner:/)).toBeNull();
    });
  });

  describe("photo_uploaded type", () => {
    it("should render photo upload feed item with image", () => {
      const item = {
        id: "feed-3",
        type: "photo_uploaded",
        actor_name: "Jane Smith",
        event_name: "Pizza Night",
        photo: {
          photo_url: "https://example.com/photo.jpg",
          caption: "Amazing pizza!",
        },
        created_at: new Date().toISOString(),
      };

      const { getByText } = render(
        <FeedItem item={item} onPhotoPress={mockOnPhotoPress} />,
      );

      expect(getByText("Jane Smith")).toBeTruthy();
      expect(getByText(" uploaded a photo")).toBeTruthy();
      expect(getByText(" to Pizza Night")).toBeTruthy();
      expect(getByText("Amazing pizza!")).toBeTruthy();
    });

    it("should render photo without event context", () => {
      const item = {
        id: "feed-3",
        type: "photo_uploaded",
        actor_name: "Jane Smith",
        photo: {
          photo_url: "https://example.com/photo.jpg",
        },
        created_at: new Date().toISOString(),
      };

      const { getByText, queryByText } = render(
        <FeedItem item={item} onPhotoPress={mockOnPhotoPress} />,
      );

      expect(getByText("Jane Smith")).toBeTruthy();
      expect(getByText(" uploaded a photo")).toBeTruthy();
      expect(queryByText(/to /)).toBeNull();
    });

    it("should call onPhotoPress when photo is tapped", () => {
      const mockPhoto = {
        photo_url: "https://example.com/photo.jpg",
        caption: "Test",
      };

      const item = {
        id: "feed-3",
        type: "photo_uploaded",
        actor_name: "Jane Smith",
        photo: mockPhoto,
        created_at: new Date().toISOString(),
      };

      const { getByText } = render(
        <FeedItem item={item} onPhotoPress={mockOnPhotoPress} />,
      );

      fireEvent.press(getByText("Jane Smith"));
      expect(mockOnPhotoPress).toHaveBeenCalledWith(mockPhoto);
    });

    it("should render ReactionBar for photos", () => {
      const item = {
        id: "feed-3",
        type: "photo_uploaded",
        entity_id: "photo-123",
        actor_name: "Jane Smith",
        photo: {
          id: "photo-123",
          photo_url: "https://example.com/photo.jpg",
        },
        created_at: new Date().toISOString(),
      };

      const { getByTestId } = render(
        <FeedItem item={item} onPhotoPress={jest.fn()} />
      );

      expect(getByTestId("reaction-bar-photo-123")).toBeTruthy();
    });
  });

  describe("comment_added type", () => {
    it("should render comment feed item", () => {
      const item = {
        id: "feed-4",
        type: "comment_added",
        actor_name: "Bob Johnson",
        event_name: "Movie Night",
        comment_text: "Great choice!",
        photo: {
          photo_url: "https://example.com/photo.jpg",
        },
        created_at: new Date().toISOString(),
      };

      const { getByText } = render(
        <FeedItem item={item} onPhotoPress={mockOnPhotoPress} />,
      );

      expect(getByText("Bob Johnson")).toBeTruthy();
      expect(getByText(" commented on a photo")).toBeTruthy();
      expect(getByText(" from Movie Night")).toBeTruthy();
      expect(getByText('"Great choice!"')).toBeTruthy();
    });

    it("should render comment without event context", () => {
      const item = {
        id: "feed-4",
        type: "comment_added",
        actor_name: "Bob Johnson",
        comment_text: "Nice!",
        photo: {
          photo_url: "https://example.com/photo.jpg",
        },
        created_at: new Date().toISOString(),
      };

      const { getByText, queryByText } = render(
        <FeedItem item={item} onPhotoPress={mockOnPhotoPress} />,
      );

      expect(getByText("Bob Johnson")).toBeTruthy();
      expect(queryByText(/from /)).toBeNull();
    });
  });

  describe("timestamp formatting", () => {
    it("should format timestamp as relative time", () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();

      const item = {
        id: "feed-1",
        type: "event_created",
        actor_name: "John Doe",
        entity_name: "Test Event",
        created_at: twoHoursAgo,
      };

      const { getByText } = render(<FeedItem item={item} />);

      expect(getByText(/ago$/)).toBeTruthy();
    });
  });
});
